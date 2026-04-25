import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql, { url }) => {
		const leagueParam = url.searchParams.get('league');
		const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

		const leagueFrag =
			selectedLeagues.length === 1
				? sql`AND m.match_type_shortname = ${selectedLeagues[0]}`
				: selectedLeagues.length > 1
					? sql`AND m.match_type_shortname = ANY(${selectedLeagues})`
					: sql``;

		const rows = await sql`
			SELECT
				m.season AS season,
				ROUND(AVG(CASE WHEN h.gate = 'a' THEN h.points END), 2) AS avg_a,
				ROUND(AVG(CASE WHEN h.gate = 'b' THEN h.points END), 2) AS avg_b,
				ROUND(AVG(CASE WHEN h.gate = 'c' THEN h.points END), 2) AS avg_c,
				ROUND(AVG(CASE WHEN h.gate = 'd' THEN h.points END), 2) AS avg_d,
				ROUND(SUM(CASE WHEN h.gate = 'a' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS win_a,
				ROUND(SUM(CASE WHEN h.gate = 'b' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS win_b,
				ROUND(SUM(CASE WHEN h.gate = 'c' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS win_c,
				ROUND(SUM(CASE WHEN h.gate = 'd' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS win_d
			FROM sel.heats h
			JOIN sel.matches m ON h.match_id = m.match_id
			WHERE
				h.gate IN ('a', 'b', 'c', 'd')
				AND h.canceled = 0
				AND h.points IS NOT NULL
				${leagueFrag}
			GROUP BY m.season
			ORDER BY m.season
		`;

		const avgPoints = rows.map((r) => ({ season: r.season, A: r.avg_a, B: r.avg_b, C: r.avg_c, D: r.avg_d }));
		const winPct = rows.map((r) => ({ season: r.season, A: r.win_a, B: r.win_b, C: r.win_c, D: r.win_d }));

		return { avgPoints, winPct };
	},
	{ cacheControl: 'public, max-age=300' }
);
