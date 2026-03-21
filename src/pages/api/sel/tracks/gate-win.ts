import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	const db = env.DB;

	if (!db) {
		return new Response(JSON.stringify({ error: 'Database not available' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const seasonParam = url.searchParams.get('season');
		const leagueParam = url.searchParams.get('league');
		const selectedSeasons = seasonParam ? seasonParam.split(',').filter(Boolean) : [];
		const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

		const mainConditions: string[] = [];
		const mainParams: (string | number)[] = [];
		let majorityCteSql = '';
		const majorityParams: (string | number)[] = [];

		if (selectedSeasons.length === 1) {
			mainConditions.push('m.season = ?');
			mainParams.push(parseInt(selectedSeasons[0], 10));
		} else if (selectedSeasons.length > 1) {
			mainConditions.push(`m.season IN (${selectedSeasons.map(() => '?').join(',')})`);
			mainParams.push(...selectedSeasons.map((s) => parseInt(s, 10)));
		}
		if (selectedLeagues.length === 1) {
			mainConditions.push('m.match_type_shortname = ?');
			mainParams.push(selectedLeagues[0]);
			// Only apply majority-track filter when exactly one season and one league are selected.
			// Across all seasons tracks change leagues, so majority over all time is misleading.
			if (selectedSeasons.length === 1) {
				mainConditions.push('m.track_city IN (SELECT track_city FROM majority_track)');
				majorityParams.push(parseInt(selectedSeasons[0], 10));
				majorityParams.push(selectedLeagues[0]);
				majorityCteSql = `majority_track AS (
					SELECT track_city FROM (
						SELECT track_city, match_type_shortname,
						       RANK() OVER (PARTITION BY track_city ORDER BY COUNT(*) DESC) AS rnk
						FROM matches
						WHERE season = ? AND match_subtype_shortname = 'MR'
						GROUP BY track_city, match_type_shortname
					) WHERE rnk = 1 AND match_type_shortname = ?
				),
				`;
			}
		} else if (selectedLeagues.length > 1) {
			mainConditions.push(
				`m.match_type_shortname IN (${selectedLeagues.map(() => '?').join(',')})`
			);
			mainParams.push(...selectedLeagues);
		}
		const extraWhere = mainConditions.map((c) => `AND ${c}`).join(' ');
		const allParams = [...majorityParams, ...mainParams];

		const result = await db
			.prepare(
				`
			WITH ${majorityCteSql}raw_counts AS (
				SELECT
					m.track_city AS Track,
					SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END) AS total_wins,
					SUM(CASE WHEN h.gate = 'a' AND h.points = 3 THEN 1 ELSE 0 END) AS wa,
					SUM(CASE WHEN h.gate = 'b' AND h.points = 3 THEN 1 ELSE 0 END) AS wb,
					SUM(CASE WHEN h.gate = 'c' AND h.points = 3 THEN 1 ELSE 0 END) AS wc,
					SUM(CASE WHEN h.gate = 'd' AND h.points = 3 THEN 1 ELSE 0 END) AS wd
				FROM heats h
				JOIN matches m ON h.match_id = m.match_id
				WHERE
					h.gate IN ('a', 'b', 'c', 'd')
					AND h.canceled = 0
					AND h.points IS NOT NULL
					${extraWhere}
				GROUP BY m.track_city
			),
			base AS (
				SELECT
					Track,
					ROUND(wa * 100.0 / NULLIF(total_wins, 0), 1) AS A,
					ROUND(wb * 100.0 / NULLIF(total_wins, 0), 1) AS B,
					ROUND(wc * 100.0 / NULLIF(total_wins, 0), 1) AS C,
					ROUND(wd * 100.0 / NULLIF(total_wins, 0), 1) AS D
				FROM raw_counts
			)
			SELECT Track, A, B, C, D,
				ROUND(MAX(A, B, C, D) - MIN(A, B, C, D), 1) AS Bias
			FROM base
			UNION ALL
			SELECT
				'Total Average',
				ROUND(AVG(A), 1),
				ROUND(AVG(B), 1),
				ROUND(AVG(C), 1),
				ROUND(AVG(D), 1),
				ROUND(MAX(AVG(A), AVG(B), AVG(C), AVG(D)) - MIN(AVG(A), AVG(B), AVG(C), AVG(D)), 1)
			FROM base
			ORDER BY A DESC
		`
			)
			.bind(...allParams)
			.all();

		return new Response(JSON.stringify({ rows: result.results || [] }), {
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
