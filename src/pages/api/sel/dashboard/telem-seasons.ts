import type { APIRoute } from 'astro';
import telemSeasonsQuery from './queries/telem-seasons.sql?raw';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const db = locals.runtime?.env?.DB;

	if (!db) {
		return new Response(
			JSON.stringify({
				error: 'Database not available',
			}),
			{
				status: 503,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}

	try {
		const startTime = Date.now();
		const result = await db.prepare(telemSeasonsQuery).all();
		console.log(`[telem-seasons] Query time: ${Date.now() - startTime}ms`);
		const seasons = result.results?.map((row: any) => row.Season) || [];

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
				error: 'Failed to fetch telemetry seasons',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
