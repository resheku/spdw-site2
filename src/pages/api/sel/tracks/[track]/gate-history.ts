import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url, params }) => {
	const db = locals.runtime?.env?.DB;
	const track = params.track ?? '';

	if (!db) {
		return new Response(JSON.stringify({ error: 'Database not available' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!track) {
		return new Response(JSON.stringify({ error: 'Track not specified' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const leagueParam = url.searchParams.get('league');
	const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

	const conditions: string[] = ['m.track_city = ?'];
	const bindParams: (string | number)[] = [track];

	if (selectedLeagues.length === 1) {
		conditions.push('m.match_type_shortname = ?');
		bindParams.push(selectedLeagues[0]);
	} else if (selectedLeagues.length > 1) {
		conditions.push(`m.match_type_shortname IN (${selectedLeagues.map(() => '?').join(',')})`);
		bindParams.push(...selectedLeagues);
	}

	const whereClause = conditions.map(c => `AND ${c}`).join('\n\t\t\t\t');

	try {
		const [avgResult, winResult, overallAvgResult, overallWinResult, leaguesResult] = await Promise.all([
			// per-season avg points
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
					${whereClause}
				GROUP BY m.season
				ORDER BY m.season
			`).bind(...bindParams).all(),

			// per-season win pct
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
					${whereClause}
				GROUP BY m.season
				ORDER BY m.season
			`).bind(...bindParams).all(),

			// overall avg points
			db.prepare(`
				SELECT
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
					${whereClause}
			`).bind(...bindParams).all(),

			// overall win pct
			db.prepare(`
				SELECT
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
					${whereClause}
			`).bind(...bindParams).all(),

			// all leagues this track appears in
			db.prepare(`
				SELECT DISTINCT m.match_type_shortname AS code, m.match_type_name AS name
				FROM matches m
				WHERE m.track_city = ?
				ORDER BY m.match_type_shortname
			`).bind(track).all(),
		]);

		const oa = (overallAvgResult.results?.[0] as any) ?? {};
		const ow = (overallWinResult.results?.[0] as any) ?? {};

		const overallAvgBias =
			oa.A != null
				? parseFloat((Math.max(oa.A, oa.B, oa.C, oa.D) - Math.min(oa.A, oa.B, oa.C, oa.D)).toFixed(2))
				: null;
		const overallWinBias =
			ow.A != null
				? parseFloat((Math.max(ow.A, ow.B, ow.C, ow.D) - Math.min(ow.A, ow.B, ow.C, ow.D)).toFixed(1))
				: null;

		return new Response(
			JSON.stringify({
				avgPoints: avgResult.results ?? [],
				winPct: winResult.results ?? [],
				overall: {
					avgPoints: {
						A: oa.A,
						B: oa.B,
						C: oa.C,
						D: oa.D,
						'AC/BD':
							oa.A != null
								? `${(+oa.A + +oa.C).toFixed(2)}/${(+oa.B + +oa.D).toFixed(2)}`
								: null,
						Bias: overallAvgBias,
					},
					winPct: {
						A: ow.A,
						B: ow.B,
						C: ow.C,
						D: ow.D,
						Bias: overallWinBias,
					},
				},
				leagues: leaguesResult.results ?? [],
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
		console.error('[track/gate-history] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch gate history',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
