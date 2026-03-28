SELECT
	"Name",
	"Team",
	"Season",
	"Average",
	ROW_NUMBER() OVER (ORDER BY "Average" DESC) AS "No"
FROM stats
WHERE "Average" IS NOT NULL
	AND "Heats" >= 20
	AND "League" = 'PGEE'
ORDER BY "Average" DESC
LIMIT 10
