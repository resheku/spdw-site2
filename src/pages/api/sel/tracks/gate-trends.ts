import { createHandler } from '../../../../lib/api';
import avgBase from '../queries/tracks/gate-trends-avg-base.sql?raw';
import winBase from '../queries/tracks/gate-trends-win-base.sql?raw';

export const prerender = false;

export const GET = createHandler(async (sql, { url }) => {
	const leagueParam = url.searchParams.get('league');
	const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

	const [avgRows, winRows] = await Promise.all([
		sql`
			${avgBase}
			${selectedLeagues.length ? sql`AND m.match_type_shortname = ANY(${selectedLeagues})` : sql``}
			GROUP BY m.season
			ORDER BY m.season
		`,
		sql`
			${winBase}
			${selectedLeagues.length ? sql`AND m.match_type_shortname = ANY(${selectedLeagues})` : sql``}
			GROUP BY m.season
			ORDER BY m.season
		`,
	]);

	return { avgPoints: avgRows, winPct: winRows };
});
