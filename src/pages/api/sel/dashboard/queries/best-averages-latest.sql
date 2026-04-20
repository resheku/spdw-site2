WITH base AS (
	SELECT *
	FROM sel.stats
	WHERE "Average" IS NOT NULL
		AND "League" = 'PGEE'
		AND "Season" = (SELECT MAX("Season") FROM sel.stats WHERE "League" = 'PGEE')
),
team_threshold AS (
	SELECT "Team", GREATEST(1, MAX("Heats") / 3) AS min_heats
	FROM base
	GROUP BY "Team"
)
SELECT
	b."Name",
	b."Team",
	b."Season",
	b."Average",
	ROW_NUMBER() OVER (ORDER BY b."Average" DESC, b."I" DESC, b."II" DESC, b."III" DESC, b."IV" DESC, b."Heats" DESC, b."Max Speed" DESC, b."Name" ASC) AS "No"
FROM base b
JOIN team_threshold t ON b."Team" = t."Team"
WHERE b."Heats" >= t.min_heats
ORDER BY b."Average" DESC, b."I" DESC, b."II" DESC, b."III" DESC, b."IV" DESC, b."Heats" DESC, b."Max Speed" DESC, b."Name" ASC
LIMIT 10
