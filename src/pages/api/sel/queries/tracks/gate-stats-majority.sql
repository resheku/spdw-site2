WITH majority_track AS (
	SELECT track_city FROM (
		SELECT track_city, match_type_shortname,
		       RANK() OVER (PARTITION BY track_city ORDER BY COUNT(*) DESC) AS rnk
		FROM sel.matches
		WHERE season = $1 AND match_subtype_shortname = 'MR'
		GROUP BY track_city, match_type_shortname
	) AS sub
	WHERE sub.rnk = 1 AND sub.match_type_shortname = $2
),
base AS (
	SELECT
		m.track_city AS "Track",
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
		AND m.season = $1
		AND m.match_type_shortname = $2
		AND m.track_city IN (SELECT track_city FROM majority_track)
	GROUP BY m.track_city
),
totals AS (
	SELECT
		ROUND(AVG("A"), 2) AS "A",
		ROUND(AVG("B"), 2) AS "B",
		ROUND(AVG("C"), 2) AS "C",
		ROUND(6.0 - ROUND(AVG("A"), 2) - ROUND(AVG("B"), 2) - ROUND(AVG("C"), 2), 2) AS "D"
	FROM base
)
SELECT
	"Track", "A", "B", "C", "D",
	ROUND("A" + "C", 2)::text || '/' || ROUND("B" + "D", 2)::text AS "AC/BD",
	ROUND(GREATEST("A", "B", "C", "D") - LEAST("A", "B", "C", "D"), 2) AS "Bias"
FROM base
UNION ALL
SELECT
	'Total Average', "A", "B", "C", "D",
	ROUND("A" + "C", 2)::text || '/' || ROUND("B" + "D", 2)::text,
	ROUND(GREATEST("A", "B", "C", "D") - LEAST("A", "B", "C", "D"), 2)
FROM totals
ORDER BY "A" DESC
