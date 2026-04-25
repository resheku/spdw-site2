import { createHandler } from '../../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql, { params }) => {
		const track = params.track ?? '';

		if (!track) {
			return new Response(JSON.stringify({ error: 'Track not specified' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const [matchAverages, topSpeeds] = await Promise.all([
			sql`
			SELECT
				m.match_id AS "matchId",
				SUBSTRING(m.datetime, 1, 10) AS date,
				SUBSTRING(m.datetime, 12, 5) AS time,
				m.home_team_shortcut AS home,
				m.away_team_shortcut AS away,
				m.home_match_score AS "homeScore",
				m.away_match_score AS "awayScore",
				m.match_subtype_shortname AS round,
				ROUND(AVG(CASE WHEN t.max_speed > 0 THEN t.max_speed END)::numeric, 2) AS "avgSpeed",
				ROUND(AVG(CASE WHEN l.team_id = m.home_team_id AND t.max_speed > 0 THEN t.max_speed END)::numeric, 2) AS "homeAvgSpeed",
				ROUND(AVG(CASE WHEN l.team_id = m.away_team_id AND t.max_speed > 0 THEN t.max_speed END)::numeric, 2) AS "awayAvgSpeed"
			FROM sel.telemetry t
			JOIN sel.matches m ON t.match_id = m.match_id
			LEFT JOIN sel.lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
			WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
			  AND m.track_city = ${track}
			GROUP BY m.match_id, m.datetime, m.home_team_shortcut, m.away_team_shortcut,
			         m.home_match_score, m.away_match_score, m.match_subtype_shortname,
			         m.home_team_id, m.away_team_id
			ORDER BY m.datetime
		`,
			sql`
			SELECT
				l.rider_name || ' ' || l.rider_surname AS "Name",
				CASE
					WHEN l.team_id = m.home_team_id THEN m.home_team_shortcut
					ELSE m.away_team_shortcut
				END AS "Team",
				t.max_speed AS "Speed",
				t.heat_no AS "Heat",
				h.gate AS "Gate",
				h.points AS "Pts",
				m.home_team_shortcut || ' vs ' || m.away_team_shortcut AS "Match",
				SUBSTRING(m.datetime, 1, 10) AS "Date",
				CASE WHEN l.team_id = m.home_team_id THEN 1 ELSE 0 END AS "isHome"
			FROM sel.telemetry t
			JOIN sel.matches m ON t.match_id = m.match_id
			JOIN sel.lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
			LEFT JOIN sel.heats h ON h.match_id = t.match_id AND h.heat_id = t.heat_id AND h.rider_id = t.rider_id
			WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
			  AND m.track_city = ${track}
			ORDER BY t.max_speed DESC
			LIMIT 20
		`,
		]);

		return { matchAverages, topSpeeds };
	},
	{ cacheControl: 'public, max-age=300' }
);
