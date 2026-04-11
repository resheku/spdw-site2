SELECT
	m.track_city AS "Track",
	SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END) AS total_wins,
	SUM(CASE WHEN h.gate = 'a' AND h.points = 3 THEN 1 ELSE 0 END) AS wa,
	SUM(CASE WHEN h.gate = 'b' AND h.points = 3 THEN 1 ELSE 0 END) AS wb,
	SUM(CASE WHEN h.gate = 'c' AND h.points = 3 THEN 1 ELSE 0 END) AS wc,
	SUM(CASE WHEN h.gate = 'd' AND h.points = 3 THEN 1 ELSE 0 END) AS wd
FROM sel.heats h
JOIN sel.matches m ON h.match_id = m.match_id
WHERE
	h.gate IN ('a', 'b', 'c', 'd')
	AND h.canceled = 0
	AND h.points IS NOT NULL
