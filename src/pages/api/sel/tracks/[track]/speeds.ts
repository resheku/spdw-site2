import type { APIRoute } from 'astro';
import { createSql } from '../../../../../lib/sel/db';
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

	const sql = createSql(env.DATABASE_URL);
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
