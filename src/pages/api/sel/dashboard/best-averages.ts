import type { APIRoute } from 'astro';
import latestQuery from './queries/best-averages-latest.sql?raw';
import allTimeQuery from './queries/best-averages-all-time.sql?raw';

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

		// Execute both queries in parallel
		const [latestResult, allTimeResult] = await Promise.all([
			db.prepare(latestQuery).all(),
			db.prepare(allTimeQuery).all(),
		]);

		const data = {
			thisSeason: latestResult.results || [],
			allTime: allTimeResult.results || [],
		};

		console.log(`[best-averages] Total time: ${Date.now() - startTime}ms`);

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('Database error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch best averages',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
