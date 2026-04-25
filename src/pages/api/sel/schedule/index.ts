import { createHandler } from '../../../../lib/api';

export const prerender = false;

const VALID_SORT_COLUMNS: Record<string, string> = {
	round: 'round',
	type: 'match_subtype_shortname',
	date: 'datetime',
	match: 'name',
	score: 'home_match_score',
	total: 'home_match_tlt_score',
	attendance: 'attendance',
	track: 'track_city',
	league: 'match_type_shortname',
	season: 'season',
};

export const GET = createHandler(
	async (sql, { url }) => {
		const params = url.searchParams;
		const leagues = params.get('league')?.split(',').filter(Boolean) ?? [];
		const seasons = params.get('season')?.split(',').filter(Boolean).map(Number) ?? [];
		const sortCol = params.get('sortColumn') ?? 'date';
		const sortDir = params.get('sortDirection')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

		const dbSortCol = VALID_SORT_COLUMNS[sortCol] ?? 'datetime';

		const leagueFrag = leagues.length > 0 ? sql`AND match_type_shortname = ANY(${leagues})` : sql``;
		const seasonFrag = seasons.length > 0 ? sql`AND season = ANY(${seasons})` : sql``;

		const orderFrag =
			dbSortCol === 'attendance'
				? sortDir === 'ASC'
					? sql`ORDER BY CASE WHEN attendance IS NULL THEN 1 ELSE 0 END, attendance ASC`
					: sql`ORDER BY CASE WHEN attendance IS NULL THEN 1 ELSE 0 END, attendance DESC`
				: sortDir === 'ASC'
					? sql`ORDER BY ${sql(dbSortCol)} ASC`
					: sql`ORDER BY ${sql(dbSortCol)} DESC`;

		const schedule = await sql`
		SELECT
			match_id,
			round,
			match_type_shortname AS league,
			match_type_name AS "leagueName",
			match_subtype_shortname AS type,
			match_subtype_name AS "typeName",
			datetime,
			name AS "matchName",
			home_team_id AS "homeTeamId",
			home_team_shortcut AS "homeTeamShort",
			away_team_id AS "awayTeamId",
			away_team_shortcut AS "awayTeamShort",
			home_match_score AS "homeScore",
			away_match_score AS "awayScore",
			home_match_tlt_score AS "homeTotal",
			away_match_tlt_score AS "awayTotal",
			attendance,
			season,
			track_city AS track
		FROM sel.matches
		WHERE 1=1
			${leagueFrag}
			${seasonFrag}
		${orderFrag}
	`;
		return { schedule };
	},
	{ cacheControl: 'public, max-age=300' }
);
