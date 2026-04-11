SELECT MAX("Season") AS latest_season
FROM sel.stats
WHERE "League" = 'PGEE'
AND "Max Speed" IS NOT NULL
