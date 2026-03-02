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
			SELECT Track, A, B, C, D
			FROM base
			UNION ALL
			SELECT
				'Total Average',
				ROUND(AVG(A), 1),
				ROUND(AVG(B), 1),
				ROUND(AVG(C), 1),
				ROUND(AVG(D), 1)
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
