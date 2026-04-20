import { createHandler } from '../../../../lib/api';
import statsBase from '../queries/stats/stats-base.sql?raw';

export const prerender = false;

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

export const GET = createHandler(async (sql, { url }) => {
	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const teams = url.searchParams.get('team')?.split(',').filter(Boolean) || [];
	const leagues = url.searchParams.get('league')?.split(',').filter(Boolean) || [];
	const seasons = url.searchParams.get('season')?.split(',').filter(Boolean) || [];
	const sortColumns = url.searchParams.get('sortColumn')?.split(',').filter(Boolean) || [];
	const sortDirections = url.searchParams.get('sortDirection')?.split(',').filter(Boolean) || [];

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

	return { stats, totalCount: stats.length };
});
