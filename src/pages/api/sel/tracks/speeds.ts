import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import speedsQuery from '../queries/tracks/speeds.sql?raw';

export const prerender = false;

export const GET: APIRoute = async () => {
	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	try {
		const rows = await sql.unsafe(speedsQuery);

		const seasons: number[] = rows.length > 0 ? (rows[0].all_seasons as number[]) : [];
		const tracks = rows.map((r) => ({
			Track: r.track as string,
			Average: r.average as number | null,
			seasons: r.seasons as Record<string, number>,
		}));

		return new Response(JSON.stringify({ tracks, seasons }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('[tracks/speeds] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch track speed data',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
