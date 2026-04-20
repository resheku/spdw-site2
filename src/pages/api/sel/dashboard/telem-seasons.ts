import { createHandler } from '../../../../lib/api';
import telemSeasonsQuery from './queries/telem-seasons.sql?raw';

export const prerender = false;

export const GET = createHandler(async (sql) => {
	const startTime = Date.now();
	const rows = await sql`${telemSeasonsQuery}`;
	console.log(`[telem-seasons] Query time: ${Date.now() - startTime}ms`);
	return rows.map((row) => row.Season);
}, { cacheControl: 'public, max-age=3600' });
