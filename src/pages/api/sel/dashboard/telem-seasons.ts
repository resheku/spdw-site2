import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(async (sql) => {
	const startTime = Date.now();
	const rows = await sql`
		SELECT DISTINCT "Season"
		FROM sel.stats
		WHERE "Max Speed" IS NOT NULL
		ORDER BY "Season" ASC
	`;
	console.log(`[telem-seasons] Query time: ${Date.now() - startTime}ms`);
	return rows.map((row) => row.Season);
}, { cacheControl: 'public, max-age=3600' });
