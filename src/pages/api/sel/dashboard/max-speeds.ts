import { createHandler } from '../../../../lib/api';
import latestSeasonQuery from './queries/max-speeds-latest-season.sql?raw';
import thisSeasonQuery from './queries/max-speeds-latest.sql?params';
import allTimeQuery from './queries/max-speeds-all-time.sql?raw';

export const prerender = false;

export const GET = createHandler(async (sql) => {
	const startTime = Date.now();

	const [latestSeasonRow] = await sql`${latestSeasonQuery}`;
	const latestSeason = (latestSeasonRow?.latest_season as number) ?? new Date().getFullYear();

	const [thisSeasonRows, allTimeRows] = await Promise.all([
		thisSeasonQuery(sql, latestSeason),
		sql`${allTimeQuery}`,
	]);

	console.log(`[max-speeds] Queries: ${Date.now() - startTime}ms`);

	return { thisSeason: thisSeasonRows, allTime: allTimeRows };
});
