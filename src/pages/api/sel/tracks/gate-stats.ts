import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql, { url }) => {
		const seasonParam = url.searchParams.get('season');
		const leagueParam = url.searchParams.get('league');
		const selectedSeasons = seasonParam ? seasonParam.split(',').filter(Boolean) : [];
		const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

		const needsMajority = selectedSeasons.length === 1 && selectedLeagues.length === 1;

		const majorityCtePart = needsMajority
			? sql`majority_track AS (
				SELECT track_city FROM (
					SELECT track_city, match_type_shortname,
					       RANK() OVER (PARTITION BY track_city ORDER BY COUNT(*) DESC) AS rnk
					FROM sel.matches
					WHERE season = ${parseInt(selectedSeasons[0], 10)} AND match_subtype_shortname = 'MR'
					GROUP BY track_city, match_type_shortname
				) AS t WHERE t.rnk = 1 AND t.match_type_shortname = ${selectedLeagues[0]}
			),`
			: sql``;

		const seasonFrag =
			selectedSeasons.length === 1
				? sql`AND m.season = ${parseInt(selectedSeasons[0], 10)}`
				: selectedSeasons.length > 1
					? sql`AND m.season = ANY(${selectedSeasons.map(Number)})`
					: sql``;

		const leagueFrag =
			selectedLeagues.length === 1
				? sql`AND m.match_type_shortname = ${selectedLeagues[0]}`
				: selectedLeagues.length > 1
					? sql`AND m.match_type_shortname = ANY(${selectedLeagues})`
					: sql``;

		const majorityTrackFrag = needsMajority
			? sql`AND m.track_city IN (SELECT track_city FROM majority_track)`
			: sql``;

		const rows = await sql`
		WITH ${majorityCtePart}base AS (
			SELECT
				m.track_city AS "Track",
				ROUND(AVG(CASE WHEN h.gate = 'a' THEN h.points END), 2) AS "A",
				ROUND(AVG(CASE WHEN h.gate = 'b' THEN h.points END), 2) AS "B",
				ROUND(AVG(CASE WHEN h.gate = 'c' THEN h.points END), 2) AS "C",
				ROUND(AVG(CASE WHEN h.gate = 'd' THEN h.points END), 2) AS "D"
			FROM sel.heats h
			JOIN sel.matches m ON h.match_id = m.match_id
			WHERE
				h.gate IN ('a', 'b', 'c', 'd')
				AND h.canceled = 0
				AND h.points IS NOT NULL
				${seasonFrag}
				${leagueFrag}
				${majorityTrackFrag}
			GROUP BY m.track_city
		),
		totals AS (
			SELECT
					ROUND(AVG("A"), 2) AS "A",
				ROUND(AVG("B"), 2) AS "B",
				ROUND(AVG("C"), 2) AS "C",
				ROUND(AVG("D"), 2) AS "D"
			FROM base
		)
		SELECT
			"Track",
			"A"::float8 AS "A", "B"::float8 AS "B", "C"::float8 AS "C", "D"::float8 AS "D",
			ROUND("A" + "C", 2)::text || '/' || ROUND("B" + "D", 2)::text AS "AC/BD",
			ROUND(GREATEST("A", "B", "C", "D") - LEAST("A", "B", "C", "D"), 2)::float8 AS "Bias"
		FROM base
		UNION ALL
		SELECT
			'Total Average',
			"A"::float8, "B"::float8, "C"::float8, "D"::float8,
			ROUND("A" + "C", 2)::text || '/' || ROUND("B" + "D", 2)::text,
			ROUND(GREATEST("A", "B", "C", "D") - LEAST("A", "B", "C", "D"), 2)::float8
		FROM totals
		ORDER BY "A" DESC
	`;

		return { rows };
	},
	{ cacheControl: 'public, max-age=300' }
);
