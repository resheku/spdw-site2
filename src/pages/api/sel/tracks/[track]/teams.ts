import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import summaryQuery from '../../queries/track/teams-summary.sql?params';
import byTeamQuery from '../../queries/track/teams-by-team.sql?params';

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
		const [summaryRows, teamRows] = await Promise.all([
			summaryQuery(sql, track),
			byTeamQuery(sql, track),
		]);

		return new Response(
			JSON.stringify({
				summary: summaryRows[0] ?? null,
				teams: teamRows,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
			}
		);
	} catch (error) {
		console.error('[track/teams] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch track teams',
				details: error instanceof Error ? error.message : String(error),
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
