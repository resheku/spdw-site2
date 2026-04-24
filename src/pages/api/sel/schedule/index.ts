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

export const GET = createHandler(async (sql, { url }) => {
	const params = url.searchParams;
	const leagues = params.get('league')?.split(',').filter(Boolean) ?? [];
	const seasons = params.get('season')?.split(',').filter(Boolean).map(Number) ?? [];
	const sortCol = params.get('sortColumn') ?? 'date';
	const sortDir = params.get('sortDirection')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

	const dbSortCol = VALID_SORT_COLUMNS[sortCol] ?? 'datetime';

	const whereClauses: string[] = [];
	const queryParams: unknown[] = [];

	if (leagues.length > 0) {
		const placeholders = leagues.map((_, i) => `$${queryParams.length + i + 1}`).join(', ');
		leagues.forEach((l) => queryParams.push(l));
		whereClauses.push(`match_type_shortname IN (${placeholders})`);
	}
	if (seasons.length > 0) {
		const placeholders = seasons.map((_, i) => `$${queryParams.length + i + 1}`).join(', ');
		seasons.forEach((s) => queryParams.push(s));
		whereClauses.push(`season IN (${placeholders})`);
	}

	const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
	const nullLast = dbSortCol === 'attendance' ? `CASE WHEN attendance IS NULL THEN 1 ELSE 0 END, ` : '';
	const orderBy = `ORDER BY ${nullLast}${dbSortCol} ${sortDir}`;

	const query = `
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
		FROM matches
		${where}
		${orderBy}
	`;

	const schedule = await sql.unsafe(query, queryParams as Parameters<typeof sql.unsafe>[1]);
	return { schedule };
}, { cacheControl: 'public, max-age=300' });
