SELECT MAX(Season) as latest_season
FROM stats
WHERE League = 'PGEE'
AND "Max Speed" IS NOT NULL
