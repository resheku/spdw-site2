SELECT
	match_id,
	round,
	match_type_shortname AS league,
	match_type_name AS "leagueName",
	match_subtype_shortname AS type,
	match_subtype_name AS "typeName",
	datetime,
	name AS "matchName",
	home_team_id AS "homeTeamId",
	home_team_shortcut AS "homeTeamShort",
	away_team_id AS "awayTeamId",
	away_team_shortcut AS "awayTeamShort",
	home_match_score AS "homeScore",
	away_match_score AS "awayScore",
	home_match_tlt_score AS "homeTotal",
	away_match_tlt_score AS "awayTotal",
	attendance,
	season,
	track_city AS track
FROM matches
WHERE 1=1
