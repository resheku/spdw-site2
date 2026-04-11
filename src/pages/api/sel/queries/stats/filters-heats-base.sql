SELECT MIN("Heats") AS "minHeats", MAX("Heats") AS "maxHeats"
FROM sel.stats
WHERE "Heats" IS NOT NULL AND "Heats" > 0
