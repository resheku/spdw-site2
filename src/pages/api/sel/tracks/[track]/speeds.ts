import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals, params }) => {
	const db = locals.runtime?.env?.DB;
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
		const [matchAvgResult, topSpeedsResult] = await Promise.all([
			db
				.prepare(
					`
				SELECT
					m.match_id AS matchId,
					substr(m.datetime, 1, 10) AS date,
					substr(m.datetime, 12, 5) AS time,
					m.home_team_shortcut AS home,
					m.away_team_shortcut AS away,
					m.home_match_score AS homeScore,
					m.away_match_score AS awayScore,
					m.match_subtype_shortname AS round,
					ROUND(AVG(CASE WHEN t.max_speed > 0 THEN t.max_speed END), 2) AS avgSpeed,
					ROUND(AVG(CASE WHEN l.team_id = m.home_team_id AND t.max_speed > 0 THEN t.max_speed END), 2) AS homeAvgSpeed,
					ROUND(AVG(CASE WHEN l.team_id = m.away_team_id AND t.max_speed > 0 THEN t.max_speed END), 2) AS awayAvgSpeed
				FROM telemetry t
				JOIN matches m ON t.match_id = m.match_id
				LEFT JOIN lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
				WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
				  AND m.track_city = ?
				GROUP BY m.match_id, m.datetime
				ORDER BY m.datetime
			`
				)
				.bind(track)
				.all(),

			db
				.prepare(
					`
				SELECT
					l.rider_name || ' ' || l.rider_surname AS Name,
					CASE
						WHEN l.team_id = m.home_team_id THEN m.home_team_shortcut
						ELSE m.away_team_shortcut
					END AS Team,
					t.max_speed AS Speed,
					t.heat_no AS Heat,
					h.gate AS Gate,
					h.points AS Pts,
					m.home_team_shortcut || ' vs ' || m.away_team_shortcut AS Match,
					substr(m.datetime, 1, 10) AS Date,
					CASE WHEN l.team_id = m.home_team_id THEN 1 ELSE 0 END AS isHome
				FROM telemetry t
				JOIN matches m ON t.match_id = m.match_id
				JOIN lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
				LEFT JOIN heats h ON t.heat_id = h.heat_id AND h.rider_id = t.rider_id
				WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
				  AND m.track_city = ?
				ORDER BY t.max_speed DESC
				LIMIT 20
			`
				)
				.bind(track)
				.all(),
		]);

		return new Response(
			JSON.stringify({
				matchAverages: matchAvgResult.results ?? [],
				topSpeeds: topSpeedsResult.results ?? [],
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
		console.error('[track/speeds] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch track speed data',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
