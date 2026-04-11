SELECT
	ROUND(AVG(CASE WHEN h.gate = 'a' THEN h.points END), 2) AS "A",
	ROUND(AVG(CASE WHEN h.gate = 'b' THEN h.points END), 2) AS "B",
	ROUND(AVG(CASE WHEN h.gate = 'c' THEN h.points END), 2) AS "C",
	ROUND(6.0
		- ROUND(AVG(CASE WHEN h.gate = 'a' THEN h.points END), 2)
		- ROUND(AVG(CASE WHEN h.gate = 'b' THEN h.points END), 2)
		- ROUND(AVG(CASE WHEN h.gate = 'c' THEN h.points END), 2), 2) AS "D"
FROM sel.heats h
JOIN sel.matches m ON h.match_id = m.match_id
WHERE
	h.gate IN ('a', 'b', 'c', 'd')
	AND h.canceled = 0
	AND h.points IS NOT NULL
