import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql) => {
		const [leaguesResult, seasonsResult] = await Promise.all([
			sql`SELECT DISTINCT match_type_shortname AS shortname, match_type_name AS name FROM sel.matches ORDER BY match_type_name`,
			sql`SELECT DISTINCT season FROM sel.schedule ORDER BY season ASC`,
		]);

		const leagues = leaguesResult.map((r) => ({ shortname: r.shortname, name: r.name }));
		const seasons = seasonsResult.map((r) => r.season);

		return { leagues, seasons };
	},
	{ cacheControl: 'public, max-age=3600' }
);
