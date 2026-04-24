import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(async (sql, { url }) => {
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
					FROM matches
					WHERE season = ${parseInt(selectedSeasons[0], 10)} AND match_subtype_shortname = 'MR'
					GROUP BY track_city, match_type_shortname
				) AS t WHERE t.rnk = 1 AND t.match_type_shortname = ${selectedLeagues[0]}
			),`
		: sql``;

	const seasonFrag =
		selectedSeasons.length === 1
			? sql`AND m.season = ${parseInt(selectedSeasons[0], 10)}`
			: selectedSeasons.length > 1
				? sql`AND m.season IN (${sql(selectedSeasons.map(Number))})`
				: sql``;

	const leagueFrag =
		selectedLeagues.length === 1
			? sql`AND m.match_type_shortname = ${selectedLeagues[0]}`
			: selectedLeagues.length > 1
				? sql`AND m.match_type_shortname IN (${sql(selectedLeagues)})`
				: sql``;

	const majorityTrackFrag = needsMajority
		? sql`AND m.track_city IN (SELECT track_city FROM majority_track)`
		: sql``;

	const rows = await sql`
		WITH ${majorityCtePart}raw_counts AS (
			SELECT
				m.track_city AS "Track",
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
				${seasonFrag}
				${leagueFrag}
				${majorityTrackFrag}
			GROUP BY m.track_city
		),
		base AS (
			SELECT
				"Track",
				ROUND(wa * 100.0 / NULLIF(total_wins, 0), 1) AS "A",
				ROUND(wb * 100.0 / NULLIF(total_wins, 0), 1) AS "B",
				ROUND(wc * 100.0 / NULLIF(total_wins, 0), 1) AS "C",
				ROUND(wd * 100.0 / NULLIF(total_wins, 0), 1) AS "D"
			FROM raw_counts
		)
		SELECT "Track", "A", "B", "C", "D",
			ROUND(GREATEST("A", "B", "C", "D") - LEAST("A", "B", "C", "D"), 1) AS "Bias"
		FROM base
		UNION ALL
		SELECT
			'Total Average',
			ROUND(AVG("A"), 1),
			ROUND(AVG("B"), 1),
			ROUND(AVG("C"), 1),
			ROUND(AVG("D"), 1),
			ROUND(GREATEST(AVG("A"), AVG("B"), AVG("C"), AVG("D")) - LEAST(AVG("A"), AVG("B"), AVG("C"), AVG("D")), 1)
		FROM base
		ORDER BY "A" DESC
	`;

	return { rows };
}, { cacheControl: 'public, max-age=300' });
