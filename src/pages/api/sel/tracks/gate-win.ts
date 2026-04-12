import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import gateWinBase from '../queries/tracks/gate-win-base.sql?raw';
import gateWinMajority from '../queries/tracks/gate-win-majority.sql?params';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	try {
		const seasonParam = url.searchParams.get('season');
		const leagueParam = url.searchParams.get('league');
		const selectedSeasons = seasonParam ? seasonParam.split(',').filter(Boolean) : [];
		const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

		let rows;

		if (selectedSeasons.length === 1 && selectedLeagues.length === 1) {
			rows = await gateWinMajority(
				sql,
				parseInt(selectedSeasons[0], 10),
				selectedLeagues[0],
			);
		} else {
			const seasonCond =
				selectedSeasons.length === 1
					? sql`AND m.season = ${parseInt(selectedSeasons[0], 10)}`
					: selectedSeasons.length > 1
						? sql`AND m.season = ANY(${selectedSeasons.map(Number)})`
						: sql``;
			const leagueCond =
				selectedLeagues.length === 1
					? sql`AND m.match_type_shortname = ${selectedLeagues[0]}`
					: selectedLeagues.length > 1
						? sql`AND m.match_type_shortname = ANY(${selectedLeagues})`
						: sql``;

			rows = await sql`
				WITH raw_counts AS (
					${gateWinBase}
					${seasonCond}
					${leagueCond}
					GROUP BY m.track_city
				),
				base AS (
					SELECT
						"Track",
						ROUND((wa * 100.0 / NULLIF(total_wins, 0))::numeric, 1) AS "A",
						ROUND((wb * 100.0 / NULLIF(total_wins, 0))::numeric, 1) AS "B",
						ROUND((wc * 100.0 / NULLIF(total_wins, 0))::numeric, 1) AS "C",
						ROUND((wd * 100.0 / NULLIF(total_wins, 0))::numeric, 1) AS "D"
					FROM raw_counts
				)
				SELECT "Track", "A", "B", "C", "D",
					ROUND(GREATEST("A", "B", "C", "D") - LEAST("A", "B", "C", "D"), 1) AS "Bias"
				FROM base
				UNION ALL
				SELECT
					'Total Average',
					ROUND(AVG("A"), 1),
					ROUND(AVG("B"), 1),
					ROUND(AVG("C"), 1),
					ROUND(AVG("D"), 1),
					ROUND(GREATEST(AVG("A"), AVG("B"), AVG("C"), AVG("D")) - LEAST(AVG("A"), AVG("B"), AVG("C"), AVG("D")), 1)
				FROM base
				ORDER BY "A" DESC
			`;
		}

		return new Response(JSON.stringify({ rows }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('[tracks/gate-win] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch gate win data',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
