import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import matchesQuery from '../../queries/track/matches.sql?raw';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
	const track = params.track ?? '';

	if (!track) {
		return new Response(JSON.stringify({ error: 'Track not specified' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	try {
		const rows = await sql.unsafe(matchesQuery, [track]);
		return new Response(JSON.stringify({ matches: rows }), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
		});
	} catch (error) {
		console.error('[track/matches] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch track matches',
				details: error instanceof Error ? error.message : String(error),
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
