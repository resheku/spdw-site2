SELECT
	m.season AS season,
	ROUND((SUM(CASE WHEN h.gate = 'a' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
		/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0))::numeric, 1) AS "A",
	ROUND((SUM(CASE WHEN h.gate = 'b' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
		/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0))::numeric, 1) AS "B",
	ROUND((SUM(CASE WHEN h.gate = 'c' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
		/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0))::numeric, 1) AS "C",
	ROUND((SUM(CASE WHEN h.gate = 'd' AND h.points = 3 THEN 1 ELSE 0 END) * 100.0
		/ NULLIF(SUM(CASE WHEN h.points = 3 THEN 1 ELSE 0 END), 0))::numeric, 1) AS "D"
FROM sel.heats h
JOIN sel.matches m ON h.match_id = m.match_id
WHERE
	h.gate IN ('a', 'b', 'c', 'd')
	AND h.canceled = 0
	AND h.points IS NOT NULL
