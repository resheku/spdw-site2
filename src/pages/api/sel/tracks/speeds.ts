import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(async (sql) => {
	const rows = await sql`
		WITH season_avgs AS (
			SELECT
				m.track_city AS track,
				m.season AS season,
				ROUND(AVG(CASE WHEN t.max_speed > 0 THEN t.max_speed END)::numeric, 2) AS avg_speed
			FROM telemetry t
			JOIN matches m ON t.match_id = m.match_id
			WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
			  AND m.track_city IS NOT NULL
			GROUP BY m.track_city, m.season
		)
		SELECT
			track,
			json_object_agg(season::text, avg_speed) AS seasons,
			ROUND(AVG(avg_speed)::numeric, 2) AS average,
			(SELECT json_agg(s ORDER BY s) FROM (SELECT DISTINCT season AS s FROM season_avgs) AS sq) AS all_seasons
		FROM season_avgs
		GROUP BY track
		ORDER BY average DESC
	`;

	const seasons: number[] = rows.length > 0 ? (rows[0].all_seasons as number[]) : [];
	const tracks = rows.map((r) => ({
		Track: r.track as string,
		Average: r.average as number | null,
		seasons: r.seasons as Record<string, number>,
	}));

	return { tracks, seasons };
}, { cacheControl: 'public, max-age=300' });
