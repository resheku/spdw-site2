import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
	const db = locals.runtime?.env?.DB;

	if (!db) {
		return new Response(JSON.stringify({ error: 'Database not available' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const season = url.searchParams.get('season');
		const league = url.searchParams.get('league');

		const extraConditions: string[] = [];
		const params: (string | number)[] = [];
		if (season) {
			extraConditions.push('m.season = ?');
			params.push(parseInt(season, 10));
		}
		if (league) {
			extraConditions.push('m.match_type_shortname = ?');
			params.push(league);
		}
		const extraWhere = extraConditions.length > 0 ? '\t\t\t\t\tAND ' + extraConditions.join('\n\t\t\t\t\tAND ') : '';

		const result = await db.prepare(`
			WITH raw_counts AS (
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
		`).bind(...params).all();

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
