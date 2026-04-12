import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import statsBase from '../queries/stats/stats-base.sql?raw';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	try {
		// Get query parameters (comma-separated values for filters)
		const search = url.searchParams.get('search')?.toLowerCase() || '';
		const teams = url.searchParams.get('team')?.split(',').filter(Boolean) || [];
		const leagues = url.searchParams.get('league')?.split(',').filter(Boolean) || [];
		const seasons = url.searchParams.get('season')?.split(',').filter(Boolean) || [];
		const sortColumns = url.searchParams.get('sortColumn')?.split(',').filter(Boolean) || [];
		const sortDirections = url.searchParams.get('sortDirection')?.split(',').filter(Boolean) || [];

		const validColumns = [
			'Season',
			'Name',
			'Team',
			'Average',
			'Match',
			'Heats',
			'Points',
			'Bonus',
			'Home Avg.',
			'Away Avg.',
			'I',
			'II',
			'III',
			'IV',
			'R',
			'T',
			'M',
			'X',
			'F',
			'Warn',
			'Max Speed',
			'League',
		];

		const specialEmptyHandling = ['Average', 'Home Avg.', 'Away Avg.', 'Max Speed'];
		const orderClauses: string[] = [];

		sortColumns.forEach((column, index) => {
			if (validColumns.includes(column)) {
				const direction = (sortDirections[index] || 'desc') === 'asc' ? 'ASC' : 'DESC';
				const colId = `"${column}"`;

				if (specialEmptyHandling.includes(column)) {
					orderClauses.push(`CASE WHEN ${colId} IS NULL THEN 1 ELSE 0 END`);
				}
				orderClauses.push(`${colId} ${direction}`);
			}
		});

		const orderSql = orderClauses.length
			? sql.unsafe(`ORDER BY ${orderClauses.join(', ')}`)
			: sql``;

		const stats = await sql`
			${statsBase}
			${search ? sql`AND LOWER("Name") LIKE ${'%' + search + '%'}` : sql``}
			${teams.length ? sql`AND "Team" ILIKE ANY(${teams.map((t) => `%${t}%`)})` : sql``}
			${leagues.length ? sql`AND "League" = ANY(${leagues})` : sql``}
			${seasons.length ? sql`AND "Season" = ANY(${seasons.map(Number)})` : sql``}
			${orderSql}
		`;

		return new Response(
			JSON.stringify({
				stats,
				totalCount: stats.length,
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=300',
				},
			}
		);
	} catch (error) {
		console.error('Database error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch stats',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
