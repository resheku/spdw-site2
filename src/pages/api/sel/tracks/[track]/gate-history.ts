import { createHandler } from '../../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql, { url, params }) => {
		const track = params.track ?? '';

		if (!track) {
			return new Response(JSON.stringify({ error: 'Track not specified' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const leagueParam = url.searchParams.get('league');
		const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

		const leagueFrag =
			selectedLeagues.length > 0
				? sql`AND m.match_type_shortname = ANY(${selectedLeagues})`
				: sql``;

		const [gateRows, leaguesResult] = await Promise.all([
			sql`
			SELECT
				m.season AS season,
				ROUND(AVG(CASE WHEN h.gate = 'a' THEN h.points END)::numeric, 2)::float8 AS avg_a,
				ROUND(AVG(CASE WHEN h.gate = 'b' THEN h.points END)::numeric, 2)::float8 AS avg_b,
				ROUND(AVG(CASE WHEN h.gate = 'c' THEN h.points END)::numeric, 2)::float8 AS avg_c,
				ROUND(AVG(CASE WHEN h.gate = 'd' THEN h.points END)::numeric, 2)::float8 AS avg_d,
				ROUND(SUM(CASE WHEN h.gate = 'a' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1)::float8 AS win_a,
				ROUND(SUM(CASE WHEN h.gate = 'b' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1)::float8 AS win_b,
				ROUND(SUM(CASE WHEN h.gate = 'c' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1)::float8 AS win_c,
				ROUND(SUM(CASE WHEN h.gate = 'd' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1)::float8 AS win_d
			FROM sel.heats h
			JOIN sel.matches m ON h.match_id = m.match_id
			WHERE h.gate IN ('a','b','c','d') AND h.canceled = 0 AND h.points IS NOT NULL
				AND m.track_city = ${track}
				${leagueFrag}
			GROUP BY GROUPING SETS ((m.season), ())
			ORDER BY m.season NULLS LAST
		`,
			sql`
			SELECT DISTINCT m.match_type_shortname AS code, m.match_type_name AS name
			FROM sel.matches m
			WHERE m.track_city = ${track}
			ORDER BY m.match_type_shortname
		`,
		]);

		const seasonRows = gateRows.filter((r) => r.season != null);
		const overallRow = (gateRows.find((r) => r.season == null) ?? {}) as Record<string, number | null>;

		const avgResult = seasonRows.map((r) => ({ season: r.season, A: r.avg_a, B: r.avg_b, C: r.avg_c, D: r.avg_d }));
		const winResult = seasonRows.map((r) => ({ season: r.season, A: r.win_a, B: r.win_b, C: r.win_c, D: r.win_d }));

		const oa = { A: overallRow.avg_a, B: overallRow.avg_b, C: overallRow.avg_c, D: overallRow.avg_d };
		const ow = { A: overallRow.win_a, B: overallRow.win_b, C: overallRow.win_c, D: overallRow.win_d };

		const overallAvgBias =
			oa.A != null && oa.B != null && oa.C != null && oa.D != null
				? parseFloat(
						(Math.max(+oa.A, +oa.B, +oa.C, +oa.D) - Math.min(+oa.A, +oa.B, +oa.C, +oa.D)).toFixed(2)
					)
				: null;
		const overallWinBias =
			ow.A != null && ow.B != null && ow.C != null && ow.D != null
				? parseFloat(
						(Math.max(+ow.A, +ow.B, +ow.C, +ow.D) - Math.min(+ow.A, +ow.B, +ow.C, +ow.D)).toFixed(1)
					)
				: null;

		return {
			avgPoints: avgResult,
			winPct: winResult,
			overall: {
				avgPoints: {
					A: oa.A,
					B: oa.B,
					C: oa.C,
					D: oa.D,
					'AC/BD':
						oa.A != null && oa.B != null && oa.C != null && oa.D != null
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
			leagues: leaguesResult,
		};
	},
	{ cacheControl: 'public, max-age=300' }
);
