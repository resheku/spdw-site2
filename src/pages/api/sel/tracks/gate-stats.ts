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
			WITH base AS (
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
		`).bind(...params).all();

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
