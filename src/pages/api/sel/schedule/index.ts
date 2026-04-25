import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql, { url }) => {
		const params = url.searchParams;
		const leagues = params.get('league')?.split(',').filter(Boolean) ?? [];
		const seasons = params.get('season')?.split(',').filter(Boolean).map(Number) ?? [];
		const sortCol = params.get('sortColumn') ?? 'date';
		const asc = params.get('sortDirection')?.toUpperCase() === 'ASC';

		const ORDER_FRAGS = {
			round: asc ? sql`ORDER BY m.round ASC NULLS LAST` : sql`ORDER BY m.round DESC NULLS LAST`,
			type: asc
				? sql`ORDER BY m.match_subtype_shortname ASC NULLS LAST`
				: sql`ORDER BY m.match_subtype_shortname DESC NULLS LAST`,
			date: asc
				? sql`ORDER BY m.datetime ASC NULLS LAST`
				: sql`ORDER BY m.datetime DESC NULLS LAST`,
			match: asc ? sql`ORDER BY s.name ASC NULLS LAST` : sql`ORDER BY s.name DESC NULLS LAST`,
			score: asc
				? sql`ORDER BY m.home_match_score ASC NULLS LAST`
				: sql`ORDER BY m.home_match_score DESC NULLS LAST`,
			total: asc
				? sql`ORDER BY m.home_match_tlt_score ASC NULLS LAST`
				: sql`ORDER BY m.home_match_tlt_score DESC NULLS LAST`,
			attendance: asc
				? sql`ORDER BY CASE WHEN m.attendance IS NULL THEN 1 ELSE 0 END, m.attendance ASC`
				: sql`ORDER BY CASE WHEN m.attendance IS NULL THEN 1 ELSE 0 END, m.attendance DESC`,
			track: asc
				? sql`ORDER BY m.track_city ASC NULLS LAST`
				: sql`ORDER BY m.track_city DESC NULLS LAST`,
			league: asc
				? sql`ORDER BY COALESCE(m.match_type_shortname, s.league) ASC NULLS LAST`
				: sql`ORDER BY COALESCE(m.match_type_shortname, s.league) DESC NULLS LAST`,
			season: asc ? sql`ORDER BY s.season ASC NULLS LAST` : sql`ORDER BY s.season DESC NULLS LAST`,
		};

		const orderFrag = ORDER_FRAGS[sortCol as keyof typeof ORDER_FRAGS] ?? ORDER_FRAGS.date;

		const leagueFrag =
			leagues.length > 0
				? sql`AND COALESCE(m.match_type_shortname, s.league) = ANY(${leagues})`
				: sql``;
		const seasonFrag = seasons.length > 0 ? sql`AND s.season = ANY(${seasons})` : sql``;

		const schedule = await sql`
		SELECT
			s.id AS match_id,
			m.round,
			COALESCE(m.match_type_shortname, s.league) AS league,
			m.match_type_name AS "leagueName",
			m.match_subtype_shortname AS type,
			m.match_subtype_name AS "typeName",
			m.datetime,
			s.name AS "matchName",
			m.home_team_id AS "homeTeamId",
			m.home_team_shortcut AS "homeTeamShort",
			m.away_team_id AS "awayTeamId",
			m.away_team_shortcut AS "awayTeamShort",
			m.home_match_score AS "homeScore",
			m.away_match_score AS "awayScore",
			m.home_match_tlt_score AS "homeTotal",
			m.away_match_tlt_score AS "awayTotal",
			m.attendance,
			s.season,
			m.track_city AS track,
			s.status_id::int AS "statusId",
			s.status_name AS status
		FROM sel.schedule s
		LEFT JOIN sel.matches m ON m.match_id = s.id
		WHERE 1=1
			${leagueFrag}
			${seasonFrag}
		${orderFrag}
	`;
		return { schedule };
	},
	{ cacheControl: 'public, max-age=300' }
);
