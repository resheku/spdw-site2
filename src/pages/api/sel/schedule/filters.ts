import type { APIRoute } from 'astro';
import { createSql } from '../../../../lib/sel/db';
import { env } from 'cloudflare:workers';
import filtersLeaguesQuery from '../queries/schedule/filters-leagues.sql?raw';
import filtersSeasonsQuery from '../queries/schedule/filters-seasons.sql?raw';

export const prerender = false;

export const GET: APIRoute = async () => {
	const sql = createSql(env.DATABASE_URL);
	try {
		const [leagueRows, seasonRows] = await Promise.all([
			sql.unsafe(filtersLeaguesQuery),
			sql.unsafe(filtersSeasonsQuery),
		]);

		const leagues = leagueRows.map((r) => ({ shortname: r.shortname, name: r.name }));
		const seasons = seasonRows.map((r) => r.season);

		return new Response(JSON.stringify({ leagues, seasons }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600',
			},
		});
	} catch (error) {
		console.error('[schedule/filters] Error:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch schedule filters' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
