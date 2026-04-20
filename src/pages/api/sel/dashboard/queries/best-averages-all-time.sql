SELECT
	"Name",
	"Team",
	"Season",
	"Average",
	ROW_NUMBER() OVER (ORDER BY "Average" DESC, "I" DESC, "II" DESC, "III" DESC, "IV" DESC, "Heats" DESC, "Max Speed" DESC, "Name" ASC) AS "No"
FROM sel.stats
WHERE "Average" IS NOT NULL
	AND "Heats" >= 20
	AND "League" = 'PGEE'
ORDER BY "Average" DESC, "I" DESC, "II" DESC, "III" DESC, "IV" DESC, "Heats" DESC, "Max Speed" DESC, "Name" ASC
LIMIT 10
