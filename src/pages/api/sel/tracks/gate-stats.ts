import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const db = locals.runtime?.env?.DB;

	if (!db) {
		return new Response(JSON.stringify({ error: 'Database not available' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
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
				GROUP BY m.track_city
			)
			SELECT
				Track, A, B, C, D,
				ROUND(A + C, 2) || '/' || ROUND(B + D, 2) AS "AC/BD"
			FROM base
			UNION ALL
			SELECT
				'Total Average',
				ROUND(AVG(A), 2),
				ROUND(AVG(B), 2),
				ROUND(AVG(C), 2),
				ROUND(6.0
					- ROUND(AVG(A), 2)
					- ROUND(AVG(B), 2)
					- ROUND(AVG(C), 2), 2),
				ROUND(AVG(A) + AVG(C), 2) || '/' || ROUND(AVG(B) + (6.0 - AVG(A) - AVG(B) - AVG(C)), 2)
			FROM base
			ORDER BY A DESC
		`).all();

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
