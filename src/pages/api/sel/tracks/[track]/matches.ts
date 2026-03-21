import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
	const db = env.DB;
	const track = params.track ?? '';

	if (!db) {
		return new Response(JSON.stringify({ error: 'Database not available' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!track) {
		return new Response(JSON.stringify({ error: 'Track not specified' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const result = await db
			.prepare(
				`
			SELECT
				m.match_id AS id,
				substr(m.datetime, 1, 10) AS date,
				m.match_type_shortname AS league,
				m.match_type_name AS leagueName,
				m.match_subtype_shortname AS matchSubtype,
				m.home_team_id AS homeTeamId,
				m.home_team_shortcut AS homeShort,
				CASE WHEN m.home_team_title != '' THEN m.home_team_title ELSE m.home_team_shortcut END AS home,
				m.away_team_id AS awayTeamId,
				m.away_team_shortcut AS awayShort,
				CASE WHEN m.away_team_title != '' THEN m.away_team_title ELSE m.away_team_shortcut END AS away,
				m.home_match_score AS homeScore,
				m.away_match_score AS awayScore,
				ROUND(AVG(CASE WHEN l.team_id = m.home_team_id AND t.max_speed > 0 THEN t.max_speed END), 2) AS homeAvgSpeed,
				ROUND(AVG(CASE WHEN l.team_id = m.away_team_id AND t.max_speed > 0 THEN t.max_speed END), 2) AS awayAvgSpeed
			FROM matches m
			LEFT JOIN telemetry t ON t.match_id = m.match_id AND t.max_speed IS NOT NULL AND t.max_speed > 0
			LEFT JOIN lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
			WHERE m.track_city = ?
			GROUP BY m.match_id
			ORDER BY m.datetime DESC
		`
			)
			.bind(track)
			.all();

		return new Response(
			JSON.stringify({
				matches: result.results ?? [],
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=300',
				},
			}
		);
	} catch (error) {
		console.error('[track/matches] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch track matches',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
