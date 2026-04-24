import { createHandler } from '../../../../lib/api';

export const prerender = false;

const validColumns = [
	'Season', 'Name', 'Team', 'Average', 'Match', 'Heats', 'Points', 'Bonus',
	'Home Avg.', 'Away Avg.', 'I', 'II', 'III', 'IV', 'R', 'T', 'M', 'X', 'F',
	'Warn', 'Max Speed', 'League',
];
const specialEmptyHandling = ['Average', 'Home Avg.', 'Away Avg.', 'Max Speed'];

export const GET = createHandler(async (sql, { url }) => {
	const search = url.searchParams.get('search')?.toLowerCase() || '';
	const teams = url.searchParams.get('team')?.split(',').filter(Boolean) || [];
	const leagues = url.searchParams.get('league')?.split(',').filter(Boolean) || [];
	const seasons = url.searchParams.get('season')?.split(',').filter(Boolean) || [];
	const sortColumns = url.searchParams.get('sortColumn')?.split(',').filter(Boolean) || [];
	const sortDirections = url.searchParams.get('sortDirection')?.split(',').filter(Boolean) || [];

	const whereClauses: string[] = ['1=1'];
	const params: unknown[] = [];

	if (search) {
		params.push('%' + search + '%');
		whereClauses.push(`LOWER("Name") LIKE $${params.length}`);
	}

	if (teams.length > 0) {
		const teamConditions = teams.map((t) => {
			params.push('%' + t + '%');
			return `"Team" LIKE $${params.length}`;
		});
		whereClauses.push(`(${teamConditions.join(' OR ')})`);
	}

	if (leagues.length > 0) {
		const placeholders = leagues.map((_, i) => `$${params.length + i + 1}`).join(', ');
		leagues.forEach((l) => params.push(l));
		whereClauses.push(`"League" IN (${placeholders})`);
	}

	if (seasons.length > 0) {
		const placeholders = seasons.map((_, i) => `$${params.length + i + 1}`).join(', ');
		seasons.map(Number).forEach((s) => params.push(s));
		whereClauses.push(`"Season" IN (${placeholders})`);
	}

	const orderClauses: string[] = [];
	sortColumns.forEach((column, index) => {
		if (validColumns.includes(column)) {
			const direction = (sortDirections[index] || 'desc') === 'asc' ? 'ASC' : 'DESC';
			const col = `"${column}"`;
			if (specialEmptyHandling.includes(column)) {
				orderClauses.push(`CASE WHEN ${col} IS NULL THEN 1 ELSE 0 END`);
			}
			orderClauses.push(`${col} ${direction}`);
		}
	});
	const orderStr = orderClauses.length > 0 ? `ORDER BY ${orderClauses.join(', ')}` : '';

	const query = `SELECT * FROM sel.stats WHERE ${whereClauses.join(' AND ')} ${orderStr}`;
	const stats = await sql.unsafe(query, params as Parameters<typeof sql.unsafe>[1]);

	return { stats, totalCount: stats.length };
}, { cacheControl: 'public, max-age=300' });
