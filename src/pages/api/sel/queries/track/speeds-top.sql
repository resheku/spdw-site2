SELECT
	l.rider_name || ' ' || l.rider_surname AS "Name",
	CASE
		WHEN l.team_id = m.home_team_id THEN m.home_team_shortcut
		ELSE m.away_team_shortcut
	END AS "Team",
	t.max_speed AS "Speed",
	t.heat_no AS "Heat",
	h.gate AS "Gate",
	h.points AS "Pts",
	m.home_team_shortcut || ' vs ' || m.away_team_shortcut AS "Match",
	SUBSTR(m.datetime, 1, 10) AS "Date",
	CASE WHEN l.team_id = m.home_team_id THEN 1 ELSE 0 END AS "isHome"
FROM sel.telemetry t
JOIN sel.matches m ON t.match_id = m.match_id
JOIN sel.lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
LEFT JOIN sel.heats h ON t.heat_id = h.heat_id AND h.rider_id = t.rider_id
WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
	AND m.track_city = $1
ORDER BY t.max_speed DESC
LIMIT 20
