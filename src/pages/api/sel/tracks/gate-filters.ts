import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql) => {
		const rows = await sql`
		SELECT DISTINCT
			m.season AS season,
			m.match_type_shortname AS code,
			m.match_type_name AS name
		FROM heats h
		JOIN matches m ON h.match_id = m.match_id
		WHERE
			h.gate IN ('a', 'b', 'c', 'd')
			AND h.canceled = 0
			AND h.points IS NOT NULL
		ORDER BY m.season DESC
	`;

		const seasons = [...new Set(rows.map((r) => r.season as number))].sort((a, b) => b - a);
		const leagueMap = new Map<string, string>();
		rows.forEach((r) => {
			if (!leagueMap.has(r.code as string)) leagueMap.set(r.code as string, r.name as string);
		});
		const leagues = [...leagueMap.entries()].map(([code, name]) => ({ code, name }));

		return { seasons, leagues };
	},
	{ cacheControl: 'public, max-age=300' }
);
