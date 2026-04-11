import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import latestQuery from './queries/best-averages-latest.sql?raw';
import allTimeQuery from './queries/best-averages-all-time.sql?raw';

export const prerender = false;

export const GET: APIRoute = async () => {
	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	try {
		const startTime = Date.now();

		const [latestRows, allTimeRows] = await Promise.all([
			sql.unsafe(latestQuery),
			sql.unsafe(allTimeQuery),
		]);

		console.log(`[best-averages] Total time: ${Date.now() - startTime}ms`);

		return new Response(JSON.stringify({ thisSeason: latestRows, allTime: allTimeRows }), {
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
