import { createHandler } from '../../../../lib/api';
import latestQuery from './queries/best-averages-latest.sql?raw';
import allTimeQuery from './queries/best-averages-all-time.sql?raw';

export const prerender = false;

export const GET = createHandler(async (sql) => {
	const startTime = Date.now();

	const [latestRows, allTimeRows] = await Promise.all([
		sql`${latestQuery}`,
		sql`${allTimeQuery}`,
	]);

	console.log(`[best-averages] Total time: ${Date.now() - startTime}ms`);

	return { thisSeason: latestRows, allTime: allTimeRows };
});
