import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * Vite plugin that inlines `.sql` file imports at build time.
 *
 * For each file that contains `import queryVar from './path/to/query.sql'`
 * followed by `sql\`${queryVar}\``, the plugin:
 *   1. Removes the import statement.
 *   2. Replaces `sql\`${queryVar}\`` with `sql\`<actual sql content>\``.
 *
 * This lets you keep queries in `.sql` files for editing/syntax-highlighting
 * while using the proper postgres.js tagged-template syntax (not sql.unsafe).
 */
export function inlineSqlPlugin() {
	return {
		name: 'inline-sql',
		enforce: 'pre',

		transform(code, id) {
			if (!/\.[jt]sx?$/.test(id) || !code.includes('.sql')) return null;

			const importRegex =
				/import\s+(\w+)\s+from\s+['"]([^'"]+\.sql)(?:\?[^'"]*)?['"]\s*;?/g;

			const sqlVars = new Map();
			let match;

			while ((match = importRegex.exec(code)) !== null) {
				const [, varName, sqlPath] = match;
				try {
					const sqlFilePath = resolve(dirname(id), sqlPath);
					const sqlContent = readFileSync(sqlFilePath, 'utf-8')
						.trim()
						.replace(/\s*\n\s*/g, ' ');
					sqlVars.set(varName, sqlContent);
				} catch {
					// file not found — leave the import alone
				}
			}

			if (sqlVars.size === 0) return null;

			let result = code;

			for (const [varName, sqlContent] of sqlVars) {
				const escaped = sqlContent
					.replace(/\\/g, '\\\\')
					.replace(/`/g, '\\`')
					.replace(/\$\{/g, '\\${');

				const usageRegex = new RegExp(
					String.raw`sql\x60\s*\$\{${varName}\}\s*\x60`,
					'g',
				);
				const replaced = result.replace(usageRegex, `sql\`${escaped}\``);

				// Only remove the import if the variable was actually replaced
				if (replaced !== result) {
					result = replaced.replace(importRegex, (full, v) => v === varName ? '' : full);
					importRegex.lastIndex = 0;
				} else {
					result = replaced;
				}
			}

			return { code: result, map: null };
		},
	};
}
