SELECT
	s.id AS match_id,
	m.round,
	s.league AS league,
	m.match_type_name AS "leagueName",
	m.match_subtype_shortname AS type,
	m.match_subtype_name AS "typeName",
	m.datetime,
	s.name AS "matchName",
	m.home_team_id AS "homeTeamId",
	m.home_team_shortcut AS "homeTeamShort",
	m.away_team_id AS "awayTeamId",
	m.away_team_shortcut AS "awayTeamShort",
	m.home_match_score AS "homeScore",
	m.away_match_score AS "awayScore",
	m.home_match_tlt_score AS "homeTotal",
	m.away_match_tlt_score AS "awayTotal",
	m.attendance,
	s.season,
	m.track_city AS track
FROM sel.schedule s
LEFT JOIN sel.matches m ON s.id = m.match_id
WHERE 1=1
