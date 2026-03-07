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

	const league = url.searchParams.get('league');
	const extraConditions: string[] = [];
	const params: (string | number)[] = [];
	if (league) {
		extraConditions.push('m.match_type_shortname = ?');
		params.push(league);
	}
	const extraWhere = extraConditions.length > 0 ? 'AND ' + extraConditions.join('\n\t\t\t\tAND ') : '';

	try {
		const [avgResult, winResult] = await Promise.all([
			db.prepare(`
				SELECT
					m.season AS season,
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
				GROUP BY m.season
				ORDER BY m.season
			`).bind(...params).all(),

			db.prepare(`
				SELECT
					m.season AS season,
					ROUND(SUM(CASE WHEN h.gate = 'a' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
						/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS A,
					ROUND(SUM(CASE WHEN h.gate = 'b' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
						/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS B,
					ROUND(SUM(CASE WHEN h.gate = 'c' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
						/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS C,
					ROUND(SUM(CASE WHEN h.gate = 'd' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
						/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS D
				FROM heats h
				JOIN matches m ON h.match_id = m.match_id
				WHERE
					h.gate IN ('a', 'b', 'c', 'd')
					AND h.canceled = 0
					AND h.points IS NOT NULL
					${extraWhere}
				GROUP BY m.season
				ORDER BY m.season
			`).bind(...params).all(),
		]);

		return new Response(JSON.stringify({
			avgPoints: avgResult.results || [],
			winPct: winResult.results || [],
		}), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
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
