import type { APIRoute } from 'astro';
import { createSql } from '../../../lib/sel/db';
import { env } from 'cloudflare:workers';
import seasonsQuery from './queries/seasons.sql?raw';

export const prerender = false;

export const GET: APIRoute = async () => {
	const sql = createSql(env.DATABASE_URL);
	try {
		const startTime = Date.now();
		const rows = await sql.unsafe(seasonsQuery);
		console.log(`[seasons] Query time: ${Date.now() - startTime}ms`);
		const seasons = rows.map((row) => row.Season);

		return new Response(JSON.stringify(seasons), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600',
			},
		});
	} catch (error) {
		console.error('Database error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch seasons',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
