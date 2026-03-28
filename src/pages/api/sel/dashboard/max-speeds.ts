import type { APIRoute } from 'astro';
import { createSql } from '../../../../lib/sel/db';
import { env } from 'cloudflare:workers';
import latestSeasonQuery from './queries/max-speeds-latest-season.sql?raw';
import thisSeasonQuery from './queries/max-speeds-latest.sql?raw';
import allTimeQuery from './queries/max-speeds-all-time.sql?raw';

export const prerender = false;

export const GET: APIRoute = async () => {
	const sql = createSql(env.DATABASE_URL);
	try {
		const startTime = Date.now();

		const seasonStart = Date.now();
		const [latestSeasonRow] = await sql.unsafe(latestSeasonQuery);
		console.log(`[max-speeds] Latest season query: ${Date.now() - seasonStart}ms`);

		const latestSeason = (latestSeasonRow?.latest_season as number) ?? new Date().getFullYear();

		const queriesStart = Date.now();
		const [thisSeasonRows, allTimeRows] = await Promise.all([
			sql.unsafe(thisSeasonQuery, [latestSeason]),
			sql.unsafe(allTimeQuery),
		]);
		console.log(`[max-speeds] Both queries: ${Date.now() - queriesStart}ms`);

		console.log(`[max-speeds] Total time: ${Date.now() - startTime}ms`);

		return new Response(JSON.stringify({ thisSeason: thisSeasonRows, allTime: allTimeRows }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('Database error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch max speeds',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
