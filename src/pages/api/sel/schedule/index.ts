import { createHandler } from '../../../../lib/api';

export const prerender = false;

const VALID_SORT_COLUMNS: Record<string, string> = {
	round: 'm.round',
	type: 'm.match_subtype_shortname',
	date: 'm.datetime',
	match: 's.name',
	score: 'm.home_match_score',
	total: 'm.home_match_tlt_score',
	attendance: 'm.attendance',
	track: 'm.track_city',
	league: 'COALESCE(m.match_type_shortname, s.league)',
	season: 's.season',
};

export const GET = createHandler(
	async (sql, { url }) => {
		const params = url.searchParams;
		const leagues = params.get('league')?.split(',').filter(Boolean) ?? [];
		const seasons = params.get('season')?.split(',').filter(Boolean).map(Number) ?? [];
		const sortCol = params.get('sortColumn') ?? 'date';
		const sortDir = params.get('sortDirection')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

		const dbSortCol = VALID_SORT_COLUMNS[sortCol] ?? 'm.datetime';

		const leagueFrag =
			leagues.length > 0
				? sql`AND COALESCE(m.match_type_shortname, s.league) = ANY(${leagues})`
				: sql``;
		const seasonFrag = seasons.length > 0 ? sql`AND s.season = ANY(${seasons})` : sql``;

		const orderFrag =
			dbSortCol === 'm.attendance'
				? sortDir === 'ASC'
					? sql`ORDER BY CASE WHEN m.attendance IS NULL THEN 1 ELSE 0 END, m.attendance ASC`
					: sql`ORDER BY CASE WHEN m.attendance IS NULL THEN 1 ELSE 0 END, m.attendance DESC`
				: sortDir === 'ASC'
					? sql`ORDER BY ${sql.unsafe(dbSortCol)} ASC NULLS LAST`
					: sql`ORDER BY ${sql.unsafe(dbSortCol)} DESC NULLS LAST`;

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
