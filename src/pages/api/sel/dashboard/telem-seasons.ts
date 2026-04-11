import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import telemSeasonsQuery from './queries/telem-seasons.sql?raw';

export const prerender = false;

export const GET: APIRoute = async () => {
	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	try {
		const startTime = Date.now();
		const rows = await sql`${telemSeasonsQuery}`;
		console.log(`[telem-seasons] Query time: ${Date.now() - startTime}ms`);
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
				error: 'Failed to fetch telemetry seasons',
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
