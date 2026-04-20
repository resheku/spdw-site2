import { createHandler } from '../../../../lib/api';
import gateStatsBase from '../queries/tracks/gate-stats-base.sql?raw';
import gateStatsMajority from '../queries/tracks/gate-stats-majority.sql?params';

export const prerender = false;

export const GET = createHandler(async (sql, { url }) => {
	const seasonParam = url.searchParams.get('season');
	const leagueParam = url.searchParams.get('league');
	const selectedSeasons = seasonParam ? seasonParam.split(',').filter(Boolean) : [];
	const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

	let rows;

	if (selectedSeasons.length === 1 && selectedLeagues.length === 1) {
		rows = await gateStatsMajority(
			sql,
			parseInt(selectedSeasons[0], 10),
			selectedLeagues[0],
		);
	} else {
		const seasonCond =
			selectedSeasons.length === 1
				? sql`AND m.season = ${parseInt(selectedSeasons[0], 10)}`
				: selectedSeasons.length > 1
					? sql`AND m.season = ANY(${selectedSeasons.map(Number)})`
					: sql``;
		const leagueCond =
			selectedLeagues.length === 1
				? sql`AND m.match_type_shortname = ${selectedLeagues[0]}`
				: selectedLeagues.length > 1
					? sql`AND m.match_type_shortname = ANY(${selectedLeagues})`
					: sql``;

		rows = await sql`
			WITH base AS (
				${gateStatsBase}
				${seasonCond}
				${leagueCond}
				GROUP BY m.track_city
			),
			totals AS (
				SELECT
					ROUND(AVG("A"), 2) AS "A",
					ROUND(AVG("B"), 2) AS "B",
					ROUND(AVG("C"), 2) AS "C",
					ROUND(6.0 - ROUND(AVG("A"), 2) - ROUND(AVG("B"), 2) - ROUND(AVG("C"), 2), 2) AS "D"
				FROM base
			)
			SELECT
				"Track", "A", "B", "C", "D",
				ROUND("A" + "C", 2)::text || '/' || ROUND("B" + "D", 2)::text AS "AC/BD",
				ROUND(GREATEST("A", "B", "C", "D") - LEAST("A", "B", "C", "D"), 2) AS "Bias"
			FROM base
			UNION ALL
			SELECT
				'Total Average', "A", "B", "C", "D",
				ROUND("A" + "C", 2)::text || '/' || ROUND("B" + "D", 2)::text,
				ROUND(GREATEST("A", "B", "C", "D") - LEAST("A", "B", "C", "D"), 2)
			FROM totals
			ORDER BY "A" DESC
		`;
	}

	return { rows };
});
