import { createHandler } from '../../../../lib/api';
import gateFiltersQuery from '../queries/tracks/gate-filters.sql?raw';

export const prerender = false;

export const GET = createHandler(async (sql) => {
	const rows = await sql`${gateFiltersQuery}`;

	const seasons = [...new Set(rows.map((r) => r.season as number))].sort((a, b) => b - a);
	const leagueMap = new Map<string, string>();
	rows.forEach((r) => {
		if (!leagueMap.has(r.code as string)) leagueMap.set(r.code as string, r.name as string);
	});
	const leagues = [...leagueMap.entries()].map(([code, name]) => ({ code, name }));

	return { seasons, leagues };
});
