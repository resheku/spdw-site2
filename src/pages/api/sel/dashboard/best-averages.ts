import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql) => {
		const startTime = Date.now();

		const [thisSeason, allTime] = await Promise.all([
			sql`
			SELECT
				"Name",
				"Team",
				"Season",
				"Average",
				ROW_NUMBER() OVER (ORDER BY "Average" DESC) AS "No"
			FROM sel.stats
			WHERE "Average" IS NOT NULL
				AND "Heats" >= GREATEST(5, (SELECT MAX("Heats") FROM sel.stats WHERE "League" = 'PGEE' AND "Season" = (SELECT MAX("Season") FROM sel.stats WHERE "League" = 'PGEE')) / 3)
				AND "League" = 'PGEE'
				AND "Season" = (SELECT MAX("Season") FROM sel.stats WHERE "League" = 'PGEE')
			ORDER BY "Average" DESC
			LIMIT 10
		`,
			sql`
			SELECT
				"Name",
				"Team",
				"Season",
				"Average",
				ROW_NUMBER() OVER (ORDER BY "Average" DESC) AS "No"
			FROM sel.stats
			WHERE "Average" IS NOT NULL
				AND "Heats" >= 20
				AND "League" = 'PGEE'
			ORDER BY "Average" DESC
			LIMIT 10
		`,
		]);

		console.log(`[best-averages] Total time: ${Date.now() - startTime}ms`);
		return { thisSeason, allTime };
	},
	{ cacheControl: 'public, max-age=300' }
);
