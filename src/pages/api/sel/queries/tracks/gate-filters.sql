SELECT DISTINCT
	m.season AS season,
	m.match_type_shortname AS code,
	m.match_type_name AS name
FROM sel.heats h
JOIN sel.matches m ON h.match_id = m.match_id
WHERE
	h.gate IN ('a', 'b', 'c', 'd')
	AND h.canceled = 0
	AND h.points IS NOT NULL
ORDER BY m.season DESC
