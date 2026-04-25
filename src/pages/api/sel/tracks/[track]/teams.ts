import { createHandler } from '../../../../../lib/api';

export const prerender = false;

export const GET = createHandler(async (sql, { params }) => {
	const track = params.track ?? '';

	if (!track) {
		return new Response(JSON.stringify({ error: 'Track not specified' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const [summaryRows, teamRows] = await Promise.all([
		sql`
			SELECT
				COUNT(*) AS total,
				SUM(CASE WHEN home_match_score > away_match_score THEN 1 ELSE 0 END) AS "homeWins",
				SUM(CASE WHEN away_match_score > home_match_score THEN 1 ELSE 0 END) AS "awayWins",
				ROUND(AVG(home_match_score), 1)::float AS "avgHomeScore",
				ROUND(AVG(away_match_score), 1)::float AS "avgAwayScore"
			FROM sel.matches
			WHERE track_city = ${track}
				AND home_match_score IS NOT NULL
				AND away_match_score IS NOT NULL
		`,
		sql`
			WITH match_results AS (
				SELECT
					home_team_shortcut AS team,
					home_match_score AS scored,
					away_match_score AS conceded,
					CASE
						WHEN home_match_score > away_match_score THEN 'W'
						WHEN home_match_score = away_match_score THEN 'D'
						ELSE 'L'
					END AS result,
					true AS "hasHome"
				FROM sel.matches
				WHERE track_city = ${track}
					AND home_match_score IS NOT NULL
				UNION ALL
				SELECT
					away_team_shortcut AS team,
					away_match_score AS scored,
					home_match_score AS conceded,
					CASE
						WHEN away_match_score > home_match_score THEN 'W'
						WHEN away_match_score = home_match_score THEN 'D'
						ELSE 'L'
					END AS result,
					false AS "hasHome"
				FROM sel.matches
				WHERE track_city = ${track}
					AND away_match_score IS NOT NULL
			)
			SELECT
				team,
				COUNT(*) AS played,
				SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) AS wins,
				SUM(CASE WHEN result = 'D' THEN 1 ELSE 0 END) AS draws,
				SUM(CASE WHEN result = 'L' THEN 1 ELSE 0 END) AS losses,
				SUM(CASE WHEN result = 'W' THEN 2 WHEN result = 'D' THEN 1 ELSE 0 END) AS pts,
				ROUND(AVG(scored), 1)::float AS "avgPts",
				ROUND(100.0 * SUM(CASE WHEN result = 'W' THEN 1 ELSE 0 END) / COUNT(*), 1)::float AS "winPct",
				bool_or("hasHome") AS "hasHome"
			FROM match_results
			GROUP BY team
			ORDER BY "avgPts" DESC NULLS LAST
		`,
	]);

	return { summary: summaryRows[0] ?? null, teams: teamRows };
});
