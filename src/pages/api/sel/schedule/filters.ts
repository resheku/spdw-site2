import { createHandler } from '../../../../lib/api';
import filtersLeaguesQuery from '../queries/schedule/filters-leagues.sql?raw';
import filtersSeasonsQuery from '../queries/schedule/filters-seasons.sql?raw';

export const prerender = false;

export const GET = createHandler(async (sql) => {
	const [leagueRows, seasonRows] = await Promise.all([
		sql`${filtersLeaguesQuery}`,
		sql`${filtersSeasonsQuery}`,
	]);
	const leagues = leagueRows.map((r) => ({ shortname: r.shortname, name: r.name }));
	const seasons = seasonRows.map((r) => r.season);
	return { leagues, seasons };
}, { cacheControl: 'public, max-age=3600' });
