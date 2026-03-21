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
			WITH ${majorityCteSql}base AS (
				SELECT
					m.track_city AS Track,
					ROUND(AVG(CASE WHEN h.gate = 'a' THEN h.points END), 2) AS A,
					ROUND(AVG(CASE WHEN h.gate = 'b' THEN h.points END), 2) AS B,
					ROUND(AVG(CASE WHEN h.gate = 'c' THEN h.points END), 2) AS C,
					ROUND(6.0
						- ROUND(AVG(CASE WHEN h.gate = 'a' THEN h.points END), 2)
						- ROUND(AVG(CASE WHEN h.gate = 'b' THEN h.points END), 2)
						- ROUND(AVG(CASE WHEN h.gate = 'c' THEN h.points END), 2), 2) AS D
				FROM heats h
				JOIN matches m ON h.match_id = m.match_id
				WHERE
					h.gate IN ('a', 'b', 'c', 'd')
					AND h.canceled = 0
					AND h.points IS NOT NULL
					${extraWhere}
				GROUP BY m.track_city
			),
			totals AS (
				SELECT
					ROUND(AVG(A), 2) AS A,
					ROUND(AVG(B), 2) AS B,
					ROUND(AVG(C), 2) AS C,
					ROUND(6.0 - ROUND(AVG(A), 2) - ROUND(AVG(B), 2) - ROUND(AVG(C), 2), 2) AS D
				FROM base
			)
			SELECT
				Track, A, B, C, D,
				ROUND(A + C, 2) || '/' || ROUND(B + D, 2) AS "AC/BD",
				ROUND(MAX(A, B, C, D) - MIN(A, B, C, D), 2) AS Bias
			FROM base
			UNION ALL
			SELECT
				'Total Average', A, B, C, D,
				ROUND(A + C, 2) || '/' || ROUND(B + D, 2),
				ROUND(MAX(A, B, C, D) - MIN(A, B, C, D), 2)
			FROM totals
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
		console.error('[tracks/gate-stats] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch gate stats',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
