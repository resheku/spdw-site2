import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import avgBase from '../queries/tracks/gate-trends-avg-base.sql?raw';
import winBase from '../queries/tracks/gate-trends-win-base.sql?raw';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	const leagueParam = url.searchParams.get('league');
	const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

	try {
		const [avgRows, winRows] = await Promise.all([
			sql`
				${avgBase}
				${selectedLeagues.length ? sql`AND m.match_type_shortname = ANY(${selectedLeagues})` : sql``}
				GROUP BY m.season
				ORDER BY m.season
			`,
			sql`
				${winBase}
				${selectedLeagues.length ? sql`AND m.match_type_shortname = ANY(${selectedLeagues})` : sql``}
				GROUP BY m.season
				ORDER BY m.season
			`,
		]);

		return new Response(
			JSON.stringify({
				avgPoints: avgRows,
				winPct: winRows,
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=300',
				},
			}
		);
	} catch (error) {
		console.error('[tracks/gate-trends] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch gate trends',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
