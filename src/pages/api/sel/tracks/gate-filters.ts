import type { APIRoute } from 'astro';
import { createSql } from '../../../../lib/sel/db';
import { env } from 'cloudflare:workers';
import gateFiltersQuery from '../queries/tracks/gate-filters.sql?raw';

export const prerender = false;

export const GET: APIRoute = async () => {
	const sql = createSql(env.DATABASE_URL);
	try {
		const rows = await sql.unsafe(gateFiltersQuery);

		const seasons = [...new Set(rows.map((r) => r.season as number))].sort((a, b) => b - a);
		const leagueMap = new Map<string, string>();
		rows.forEach((r) => {
			if (!leagueMap.has(r.code as string)) leagueMap.set(r.code as string, r.name as string);
		});
		const leagues = [...leagueMap.entries()].map(([code, name]) => ({ code, name }));

		return new Response(JSON.stringify({ seasons, leagues }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('[tracks/gate-filters] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch gate filters',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
