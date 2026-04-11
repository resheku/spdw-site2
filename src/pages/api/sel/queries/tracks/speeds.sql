WITH season_avgs AS (
	SELECT
		m.track_city AS track,
		m.season AS season,
		ROUND(AVG(t.max_speed)::numeric, 2) AS avg_speed
	FROM sel.telemetry t
	JOIN sel.matches m ON t.match_id = m.match_id
	WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
	  AND m.track_city IS NOT NULL
	GROUP BY m.track_city, m.season
)
SELECT
	track,
	json_object_agg(season::text, avg_speed) AS seasons,
	ROUND(AVG(avg_speed), 2) AS average,
	(SELECT json_agg(s ORDER BY s) FROM (SELECT DISTINCT season AS s FROM season_avgs) sub) AS all_seasons
FROM season_avgs
GROUP BY track
ORDER BY average DESC
