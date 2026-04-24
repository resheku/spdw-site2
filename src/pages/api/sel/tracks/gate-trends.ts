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

		const [avgPoints, winPct] = await Promise.all([
			sql`
			SELECT
				m.season AS season,
				ROUND(AVG(CASE WHEN h.gate = 'a' THEN h.points END), 2) AS "A",
				ROUND(AVG(CASE WHEN h.gate = 'b' THEN h.points END), 2) AS "B",
				ROUND(AVG(CASE WHEN h.gate = 'c' THEN h.points END), 2) AS "C",
				ROUND(6.0
					- ROUND(AVG(CASE WHEN h.gate = 'a' THEN h.points END), 2)
					- ROUND(AVG(CASE WHEN h.gate = 'b' THEN h.points END), 2)
					- ROUND(AVG(CASE WHEN h.gate = 'c' THEN h.points END), 2), 2) AS "D"
			FROM heats h
			JOIN matches m ON h.match_id = m.match_id
			WHERE
				h.gate IN ('a', 'b', 'c', 'd')
				AND h.canceled = 0
				AND h.points IS NOT NULL
				${leagueFrag}
			GROUP BY m.season
			ORDER BY m.season
		`,
			sql`
			SELECT
				m.season AS season,
				ROUND(SUM(CASE WHEN h.gate = 'a' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS "A",
				ROUND(SUM(CASE WHEN h.gate = 'b' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS "B",
				ROUND(SUM(CASE WHEN h.gate = 'c' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS "C",
				ROUND(SUM(CASE WHEN h.gate = 'd' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
					/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0), 1) AS "D"
			FROM heats h
			JOIN matches m ON h.match_id = m.match_id
			WHERE
				h.gate IN ('a', 'b', 'c', 'd')
				AND h.canceled = 0
				AND h.points IS NOT NULL
				${leagueFrag}
			GROUP BY m.season
			ORDER BY m.season
		`,
		]);

		return { avgPoints, winPct };
	},
	{ cacheControl: 'public, max-age=300' }
);
