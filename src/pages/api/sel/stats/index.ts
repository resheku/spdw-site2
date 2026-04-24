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

	const searchFrag = search ? sql`AND LOWER("Name") LIKE ${'%' + search + '%'}` : sql``;
	const teamFrag = teams.length > 0 ? sql`AND "Team" LIKE ANY(${teams.map((t) => '%' + t + '%')})` : sql``;
	const leagueFrag = leagues.length > 0 ? sql`AND "League" = ANY(${leagues})` : sql``;
	const seasonFrag = seasons.length > 0 ? sql`AND "Season" = ANY(${seasons.map(Number)})` : sql``;

	const orderParts = sortColumns.flatMap((column, index) => {
		if (!validColumns.includes(column)) return [];
		const dirFrag = sortDirections[index] === 'asc' ? sql`ASC` : sql`DESC`;
		const parts = [];
		if (specialEmptyHandling.includes(column)) {
			parts.push(sql`CASE WHEN ${sql(column)} IS NULL THEN 1 ELSE 0 END`);
		}
		parts.push(sql`${sql(column)} ${dirFrag}`);
		return parts;
	});

	const orderFrag =
		orderParts.length > 0
			? sql`ORDER BY ${orderParts.reduce((acc, frag, i) => (i === 0 ? frag : sql`${acc}, ${frag}`))}`
			: sql``;

	const stats = await sql`
		SELECT * FROM sel.stats
		WHERE 1=1
			${searchFrag}
			${teamFrag}
			${leagueFrag}
			${seasonFrag}
		${orderFrag}
	`;

	return { stats, totalCount: stats.length };
}, { cacheControl: 'public, max-age=300' });
