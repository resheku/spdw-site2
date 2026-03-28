SELECT
	COUNT(*)::int                                                                   AS "total",
	SUM(CASE WHEN home_match_score::int > away_match_score::int THEN 1 ELSE 0 END)::int AS "homeWins",
	SUM(CASE WHEN away_match_score::int > home_match_score::int THEN 1 ELSE 0 END)::int AS "awayWins",
	ROUND(AVG(home_match_score::numeric), 1)::float                                AS "avgHomeScore",
	ROUND(AVG(away_match_score::numeric), 1)::float                                AS "avgAwayScore"
FROM matches
WHERE track_city = $1
	AND home_match_score IS NOT NULL
	AND away_match_score IS NOT NULL
