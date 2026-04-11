import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import scheduleBase from '../queries/schedule/schedule-base.sql?raw';

export const prerender = false;

const VALID_SORT_COLUMNS: Record<string, string> = {
	round: 'round',
	type: 'match_subtype_shortname',
	date: 'datetime',
	match: 'name',
	score: 'home_match_score',
	total: 'home_match_tlt_score',
	attendance: 'attendance',
	track: 'track_city',
	league: 'match_type_shortname',
	season: 'season',
};

export const GET: APIRoute = async ({ url }) => {
	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	const params = url.searchParams;
	const leagues = params.get('league')?.split(',').filter(Boolean) ?? [];
	const seasons = params.get('season')?.split(',').filter(Boolean).map(Number) ?? [];
	const sortCol = params.get('sortColumn') ?? 'date';
	const sortDir = params.get('sortDirection')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

	const dbSortCol = VALID_SORT_COLUMNS[sortCol] ?? 'datetime';

	try {
		const dirSql = sortDir === 'DESC' ? sql`DESC` : sql`ASC`;
		const nullLastSql = dbSortCol === 'attendance' ? sql`NULLS LAST` : sql``;

		const rows = await sql`
			${sql.unsafe(scheduleBase)}
			${leagues.length ? sql`AND match_type_shortname = ANY(${leagues})` : sql``}
			${seasons.length ? sql`AND season = ANY(${seasons})` : sql``}
			ORDER BY ${sql(dbSortCol)} ${dirSql} ${nullLastSql}
		`;

		return new Response(JSON.stringify({ schedule: rows }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('[schedule] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch schedule',
				details: error instanceof Error ? error.message : String(error),
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
