import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql) => {
		const startTime = Date.now();

		const [thisSeason, allTime] = await Promise.all([
			sql`
			WITH params AS (
				SELECT MAX("Season") AS latest FROM sel.stats WHERE "League" = 'PGEE'
			),
			threshold AS (
				SELECT GREATEST(5, MAX("Heats") / 3) AS val
				FROM sel.stats, params
				WHERE "League" = 'PGEE' AND "Season" = params.latest
			)
			SELECT
				"Name",
				"Team",
				"Season",
				"Average",
				ROW_NUMBER() OVER (ORDER BY "Average" DESC) AS "No"
			FROM sel.stats, params, threshold
			WHERE "Average" IS NOT NULL
				AND "League" = 'PGEE'
				AND "Season" = params.latest
				AND "Heats" >= threshold.val
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
