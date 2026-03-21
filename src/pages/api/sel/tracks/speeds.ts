import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async () => {
	const db = env.DB;

	if (!db) {
		return new Response(JSON.stringify({ error: 'Database not available' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const result = await db
			.prepare(
				`
			WITH season_avgs AS (
				SELECT
					m.track_city AS Track,
					m.season AS Season,
					ROUND(AVG(CASE WHEN t.max_speed > 0 THEN t.max_speed END), 2) AS AvgSpeed
				FROM telemetry t
				JOIN matches m ON t.match_id = m.match_id
				WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
				  AND m.track_city IS NOT NULL
				GROUP BY m.track_city, m.season
			)
			SELECT
				Track,
				json_group_object(CAST(Season AS TEXT), AvgSpeed) AS seasons,
				ROUND(AVG(AvgSpeed), 2) AS Average,
				(SELECT json_group_array(s) FROM (SELECT DISTINCT Season AS s FROM season_avgs ORDER BY s)) AS all_seasons
			FROM season_avgs
			GROUP BY Track
			ORDER BY Average DESC
		`
			)
			.all();

		const rows = result.results || [];
		const seasons: number[] =
			rows.length > 0 ? JSON.parse((rows[0] as Record<string, unknown>).all_seasons as string) : [];
		const tracks = rows.map((r: Record<string, unknown>) => ({
			Track: r.Track as string,
			Average: r.Average as number | null,
			seasons: JSON.parse(r.seasons as string) as Record<string, number>,
		}));

		return new Response(JSON.stringify({ tracks, seasons }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('[tracks/speeds] Error:', error);
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
