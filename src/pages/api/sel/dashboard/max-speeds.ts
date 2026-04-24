import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql) => {
		const startTime = Date.now();

		const seasonStart = Date.now();
		const [latestSeasonRow] = await sql`
		SELECT MAX("Season") AS latest_season
		FROM sel.stats
		WHERE "League" = 'PGEE'
		AND "Max Speed" IS NOT NULL
	`;
		console.log(`[max-speeds] Latest season query: ${Date.now() - seasonStart}ms`);

		const latestSeason = (latestSeasonRow?.latest_season as number) || new Date().getFullYear();

		const queriesStart = Date.now();
		const [thisSeason, allTime] = await Promise.all([
			sql`
			WITH top_speeds AS (
				SELECT
					t.match_id,
					t.rider_id,
					t.max_speed
				FROM telemetry t
				JOIN matches m ON t.match_id = m.match_id
				WHERE t.max_speed IS NOT NULL
				AND m.season = ${latestSeason}
				ORDER BY t.max_speed DESC
				LIMIT 50
			)
			SELECT
				ROW_NUMBER() OVER (ORDER BY ts.max_speed DESC) AS "No",
				(l.rider_name || ' ' || l.rider_surname) AS "Name",
				CASE
					WHEN l.team_id = m.home_team_id THEN m.home_team_shortcut
					WHEN l.team_id = m.away_team_id THEN m.away_team_shortcut
					ELSE 'Unknown'
				END AS "Team",
				m.season AS "Season",
				ts.max_speed AS "Speed",
				m.track_city AS "Track",
				SUBSTRING(m.datetime, 1, 10) AS "Date"
			FROM top_speeds ts
			JOIN matches m ON ts.match_id = m.match_id
			JOIN lineup l ON ts.match_id = l.match_id AND ts.rider_id = l.rider_id
			WHERE EXISTS (
				SELECT 1 FROM sel.stats s
				WHERE s."Season" = m.season
				AND s."Name" = (l.rider_name || ' ' || l.rider_surname)
				AND s."League" = 'PGEE'
			)
			ORDER BY ts.max_speed DESC
			LIMIT 10
		`,
			sql`
			WITH top_speeds AS (
				SELECT
					t.match_id,
					t.rider_id,
					t.max_speed
				FROM telemetry t
				WHERE t.max_speed IS NOT NULL
				ORDER BY t.max_speed DESC
				LIMIT 50
			)
			SELECT
				ROW_NUMBER() OVER (ORDER BY ts.max_speed DESC) AS "No",
				(l.rider_name || ' ' || l.rider_surname) AS "Name",
				CASE
					WHEN l.team_id = m.home_team_id THEN m.home_team_shortcut
					WHEN l.team_id = m.away_team_id THEN m.away_team_shortcut
					ELSE 'Unknown'
				END AS "Team",
				m.season AS "Season",
				ts.max_speed AS "Speed",
				m.track_city AS "Track",
				SUBSTRING(m.datetime, 1, 10) AS "Date"
			FROM top_speeds ts
			JOIN matches m ON ts.match_id = m.match_id
			JOIN lineup l ON ts.match_id = l.match_id AND ts.rider_id = l.rider_id
			WHERE EXISTS (
				SELECT 1 FROM sel.stats s
				WHERE s."Season" = m.season
				AND s."Name" = (l.rider_name || ' ' || l.rider_surname)
				AND s."League" = 'PGEE'
			)
			ORDER BY ts.max_speed DESC
			LIMIT 10
		`,
		]);
		console.log(`[max-speeds] Both queries: ${Date.now() - queriesStart}ms`);

		console.log(`[max-speeds] Total time: ${Date.now() - startTime}ms`);
		return { thisSeason, allTime };
	},
	{ cacheControl: 'public, max-age=300' }
);
