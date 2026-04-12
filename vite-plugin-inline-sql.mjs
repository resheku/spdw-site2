import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * Vite plugin that inlines `.sql` file imports at build time.
 *
 * Two import styles are supported:
 *
 * 1. `import queryVar from './query.sql?raw'` (or bare `.sql`)
 *    Followed by `sql\`${queryVar}\``, the plugin:
 *      - Removes the import statement.
 *      - Replaces `sql\`${queryVar}\`` with `sql\`<actual sql content>\``.
 *
 * 2. `import queryFn from './query.sql?params'`
 *    The SQL file may contain $1, $2, … placeholders (PostgreSQL param syntax).
 *    The plugin replaces the import with an inline arrow function:
 *      `const queryFn = (sqlClient, p1, p2, …) => sqlClient\`…${p1}…\`;`
 *    Call it as `queryFn(sql, param1, param2)` — no sql.unsafe needed.
 */
export function inlineSqlPlugin() {
	return {
		name: 'inline-sql',
		enforce: 'pre',

		transform(code, id) {
			if (!/\.[jt]sx?$/.test(id) || !code.includes('.sql')) return null;

			// Capture group 3 is the query suffix (?raw, ?params, …)
			const importRegex =
				/import\s+(\w+)\s+from\s+['"]([^'"]+\.sql)(\?[^'"]*)?['"]\s*;?/g;

			const sqlVars = new Map(); // varName → { content, isParams, fullMatch }
			let match;

			while ((match = importRegex.exec(code)) !== null) {
				const [fullMatch, varName, sqlPath, suffix] = match;
				const isParams = suffix === '?params';
				try {
					const sqlFilePath = resolve(dirname(id), sqlPath);
					const sqlContent = readFileSync(sqlFilePath, 'utf-8')
						.trim()
						.replace(/\s*\n\s*/g, ' ');
					sqlVars.set(varName, { content: sqlContent, isParams, fullMatch });
				} catch {
					// file not found — leave the import alone
				}
			}

			if (sqlVars.size === 0) return null;

			let result = code;

			for (const [varName, { content, isParams, fullMatch }] of sqlVars) {
				if (isParams) {
					// Replace the import with an inline function that uses tagged template literals.
					const constDecl = buildParamsFn(varName, content);
					result = result.replace(fullMatch, constDecl);
				} else {
					// ?raw / bare behaviour: two replacement patterns.
					const escaped = content
						.replace(/\\/g, '\\\\')
						.replace(/`/g, '\\`')
						.replace(/\$\{/g, '\\${');

					let replaced = result;

					// 1. sql`${varName}` — whole template is the variable.
					const standaloneRegex = new RegExp(
						String.raw`sql\x60\s*\$\{${varName}\}\s*\x60`,
						'g',
					);
					replaced = replaced.replace(standaloneRegex, `sql\`${escaped}\``);

					// 2. ${sql.unsafe(varName)} — embedded fragment inside a larger template (legacy).
					const fragmentRegex = new RegExp(
						String.raw`\$\{sql\.unsafe\(${varName}\)\}`,
						'g',
					);
					replaced = replaced.replace(fragmentRegex, escaped);

					// 3. ${varName} — bare embedded fragment; must run after (1) so the
					//    standalone sql`${varName}` form is consumed first.
					const bareFragmentRegex = new RegExp(
						String.raw`\$\{${varName}\}`,
						'g',
					);
					replaced = replaced.replace(bareFragmentRegex, escaped);

					// Only remove the import if at least one usage was replaced.
					if (replaced !== result) {
						result = replaced.replace(fullMatch, '');
					} else {
						result = replaced;
					}
				}
			}

			return { code: result, map: null };
		},
	};
}

/**
 * Given a SQL string that may contain $1, $2, … placeholders, generates an
 * arrow-function const declaration that uses postgres.js tagged template syntax:
 *
 *   const fn = (sqlClient, p1, p2) => sqlClient`… ${p1} … ${p2} …`;
 */
function buildParamsFn(varName, sqlContent) {
	// Split on $N tokens, alternating [string, '$N', string, '$N', …]
	const parts = sqlContent.split(/(\$\d+)/);

	let maxParam = 0;
	for (let i = 1; i < parts.length; i += 2) {
		const n = parseInt(parts[i].slice(1), 10);
		if (n > maxParam) maxParam = n;
	}

	const paramNames = Array.from({ length: maxParam }, (_, i) => `p${i + 1}`);

	// Escape string parts for embedding in a template literal
	const templateParts = parts.map((part, i) => {
		if (i % 2 === 0) {
			return part
				.replace(/\\/g, '\\\\')
				.replace(/`/g, '\\`')
				.replace(/\$\{/g, '\\${');
		}
		// Odd indices are the $N tokens — replace with ${pN}
		const n = parseInt(part.slice(1), 10);
		return `\${p${n}}`;
	});

	const template = templateParts.join('');
	const params = ['sqlClient', ...paramNames].join(', ');
	return `const ${varName} = (${params}) => sqlClient\`${template}\`;`;
}
