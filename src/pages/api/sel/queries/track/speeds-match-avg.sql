SELECT
	m.match_id AS "matchId",
	SUBSTR(m.datetime, 1, 10) AS date,
	SUBSTR(m.datetime, 12, 5) AS time,
	m.home_team_shortcut AS home,
	m.away_team_shortcut AS away,
	m.home_match_score::int AS "homeScore",
	m.away_match_score::int AS "awayScore",
	m.match_subtype_shortname AS round,
	ROUND(AVG(CASE WHEN t.max_speed > 0 THEN t.max_speed END)::numeric, 2)::float AS "avgSpeed",
	ROUND(AVG(CASE WHEN l.team_id = m.home_team_id AND t.max_speed > 0 THEN t.max_speed END)::numeric, 2)::float AS "homeAvgSpeed",
	ROUND(AVG(CASE WHEN l.team_id = m.away_team_id AND t.max_speed > 0 THEN t.max_speed END)::numeric, 2)::float AS "awayAvgSpeed"
FROM sel.telemetry t
JOIN sel.matches m ON t.match_id = m.match_id
LEFT JOIN sel.lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
	AND m.track_city = $1
GROUP BY
	m.match_id, m.datetime, m.home_team_shortcut, m.away_team_shortcut,
	m.home_match_score, m.away_match_score, m.match_subtype_shortname
ORDER BY m.datetime
