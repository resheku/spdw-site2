import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql) => {
		const rows = await sql`
		SELECT DISTINCT
			m.season AS season,
			m.track_city AS track,
			m.match_type_shortname AS league,
			m.home_team_shortcut AS home_team,
			m.away_team_shortcut AS away_team
		FROM sel.telemetry t
		JOIN sel.matches m ON t.match_id = m.match_id
		WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
		  AND m.track_city IS NOT NULL
		ORDER BY m.season DESC
	`;

		const seasons = [...new Set(rows.map((r) => r.season as number))].sort((a, b) => b - a);
		const tracks = [...new Set(rows.map((r) => r.track as string).filter(Boolean))].sort();
		const leagues = [...new Set(rows.map((r) => r.league as string).filter(Boolean))].sort();

		const teamSet = new Set<string>();
		rows.forEach((r) => {
			if (r.home_team) teamSet.add(r.home_team as string);
			if (r.away_team) teamSet.add(r.away_team as string);
		});
		const teams = [...teamSet].sort();

		return { seasons, tracks, teams, leagues };
	},
	{ cacheControl: 'public, max-age=300' }
);
