import { createHandler } from '../../../lib/api';
import seasonsQuery from './queries/seasons.sql?raw';

export const prerender = false;

export const GET = createHandler(async (sql) => {
	const startTime = Date.now();
	const rows = await sql`${seasonsQuery}`;
	console.log(`[seasons] Query time: ${Date.now() - startTime}ms`);
	return rows.map((row) => row.Season);
}, { cacheControl: 'public, max-age=3600' });
