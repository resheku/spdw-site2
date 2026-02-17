WITH top_speeds AS (
	SELECT 
		t.match_id,
		t.rider_id,
		t.max_speed
	FROM telemetry t
	JOIN matches m ON t.match_id = m.match_id
	WHERE t.max_speed IS NOT NULL
	AND m.season = ?
	ORDER BY t.max_speed DESC
	LIMIT 50
)
SELECT 
	ROW_NUMBER() OVER (ORDER BY ts.max_speed DESC) as No,
	(l.rider_name || ' ' || l.rider_surname) as Name,
	CASE 
		WHEN l.team_id = m.home_team_id THEN m.home_team_shortcut
		WHEN l.team_id = m.away_team_id THEN m.away_team_shortcut
		ELSE 'Unknown'
	END as Team,
	m.season as Season,
	ts.max_speed as Speed,
	m.track_city as Track,
	SUBSTR(m.datetime, 1, 10) as Date
FROM top_speeds ts
JOIN matches m ON ts.match_id = m.match_id
JOIN lineup l ON ts.match_id = l.match_id AND ts.rider_id = l.rider_id
WHERE EXISTS (
	SELECT 1 FROM stats s 
	WHERE s.Season = m.season 
	AND s.Name = (l.rider_name || ' ' || l.rider_surname)
	AND s.League = 'PGEE'
)
ORDER BY ts.max_speed DESC
LIMIT 10
