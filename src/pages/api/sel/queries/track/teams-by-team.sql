WITH match_scores AS (
	SELECT
		m.home_team_id                                                                      AS team_id,
		m.home_team_shortcut                                                                AS team_short,
		CASE WHEN m.home_team_title != '' THEN m.home_team_title ELSE m.home_team_shortcut END AS team_name,
		m.home_match_score::int                                                             AS score,
		m.away_match_score::int                                                             AS opp_score,
		true                                                                                AS is_home
	FROM sel.matches m
	WHERE m.track_city = $1
		AND m.home_match_score IS NOT NULL
		AND m.away_match_score IS NOT NULL
	UNION ALL
	SELECT
		m.away_team_id,
		m.away_team_shortcut,
		CASE WHEN m.away_team_title != '' THEN m.away_team_title ELSE m.away_team_shortcut END,
		m.away_match_score::int,
		m.home_match_score::int,
		false
	FROM sel.matches m
	WHERE m.track_city = $1
		AND m.home_match_score IS NOT NULL
		AND m.away_match_score IS NOT NULL
)
SELECT
	MAX(team_short)                                                                            AS "team",
	MAX(team_name)                                                                             AS "name",
	COUNT(*)::int                                                                              AS "played",
	SUM(CASE WHEN score > opp_score THEN 1 ELSE 0 END)::int                                   AS "wins",
	SUM(CASE WHEN score = opp_score THEN 1 ELSE 0 END)::int                                   AS "draws",
	SUM(CASE WHEN score < opp_score THEN 1 ELSE 0 END)::int                                   AS "losses",
	SUM(score)::int                                                                            AS "pts",
	ROUND(AVG(score)::numeric, 1)::float                                                       AS "avgPts",
	ROUND(SUM(CASE WHEN score > opp_score THEN 1 ELSE 0 END)::numeric * 100.0 / COUNT(*), 1)::float AS "winPct",
	bool_or(is_home)                                                                           AS "hasHome"
FROM match_scores
GROUP BY team_id
ORDER BY "avgPts" DESC NULLS LAST
