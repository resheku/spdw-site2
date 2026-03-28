SELECT
	m.match_id AS id,
	SUBSTR(m.datetime, 1, 10) AS date,
	m.match_type_shortname AS league,
	m.match_type_name AS "leagueName",
	m.match_subtype_shortname AS "matchSubtype",
	m.home_team_id AS "homeTeamId",
	m.home_team_shortcut AS "homeShort",
	CASE WHEN m.home_team_title != '' THEN m.home_team_title ELSE m.home_team_shortcut END AS home,
	m.away_team_id AS "awayTeamId",
	m.away_team_shortcut AS "awayShort",
	CASE WHEN m.away_team_title != '' THEN m.away_team_title ELSE m.away_team_shortcut END AS away,
	m.home_match_score::int AS "homeScore",
	m.away_match_score::int AS "awayScore",
	ROUND(AVG(CASE WHEN l.team_id = m.home_team_id AND t.max_speed > 0 THEN t.max_speed END)::numeric, 2)::float AS "homeAvgSpeed",
	ROUND(AVG(CASE WHEN l.team_id = m.away_team_id AND t.max_speed > 0 THEN t.max_speed END)::numeric, 2)::float AS "awayAvgSpeed"
FROM matches m
LEFT JOIN telemetry t ON t.match_id = m.match_id AND t.max_speed IS NOT NULL AND t.max_speed > 0
LEFT JOIN lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
WHERE m.track_city = $1
GROUP BY
	m.match_id, m.datetime, m.match_type_shortname, m.match_type_name, m.match_subtype_shortname,
	m.home_team_id, m.home_team_shortcut, m.home_team_title,
	m.away_team_id, m.away_team_shortcut, m.away_team_title,
	m.home_match_score, m.away_match_score
ORDER BY m.datetime DESC
