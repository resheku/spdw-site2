import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import matchAvgQuery from '../../queries/track/speeds-match-avg.sql?raw';
import topSpeedsQuery from '../../queries/track/speeds-top.sql?raw';

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
		const [matchAvgRows, topSpeedRows] = await Promise.all([
			sql.unsafe(matchAvgQuery, [track]),
			sql.unsafe(topSpeedsQuery, [track]),
		]);
		return new Response(JSON.stringify({ matchAverages: matchAvgRows, topSpeeds: topSpeedRows }), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
		});
	} catch (error) {
		console.error('[track/speeds] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch track speed data',
				details: error instanceof Error ? error.message : String(error),
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
