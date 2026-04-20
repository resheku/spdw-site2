import { createHandler } from '../../../../lib/api';
import scheduleBase from '../queries/schedule/schedule-base.sql?raw';

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
	const dirSql = sortDir === 'DESC' ? sql`DESC` : sql`ASC`;
	const nullLastSql = dbSortCol === 'attendance' ? sql`NULLS LAST` : sql``;

	const rows = await sql`
		${scheduleBase}
		${leagues.length ? sql`AND match_type_shortname = ANY(${leagues})` : sql``}
		${seasons.length ? sql`AND season = ANY(${seasons})` : sql``}
		ORDER BY ${sql(dbSortCol)} ${dirSql} ${nullLastSql}
	`;

	return { schedule: rows };
});
