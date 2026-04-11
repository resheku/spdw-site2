import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import filtersLeaguesQuery from '../queries/schedule/filters-leagues.sql?raw';
import filtersSeasonsQuery from '../queries/schedule/filters-seasons.sql?raw';

export const prerender = false;

export const GET: APIRoute = async () => {
	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	try {
		const [leagueRows, seasonRows] = await Promise.all([
			sql`${filtersLeaguesQuery}`,
			sql`${filtersSeasonsQuery}`,
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
