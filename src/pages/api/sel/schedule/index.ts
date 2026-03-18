import type { APIRoute } from 'astro';

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

export const GET: APIRoute = async ({ locals, url }) => {
	const db = locals.runtime?.env?.DB;

	if (!db) {
		return new Response(JSON.stringify({ error: 'Database not available' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const params = url.searchParams;
	const leagues = params.get('league')?.split(',').filter(Boolean) ?? [];
	const seasons = params.get('season')?.split(',').filter(Boolean).map(Number) ?? [];
	const sortCol = params.get('sortColumn') ?? 'date';
	const sortDir = params.get('sortDirection')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

	const dbSortCol = VALID_SORT_COLUMNS[sortCol] ?? 'datetime';

	const conditions: string[] = [];
	const bindings: (string | number)[] = [];

	if (leagues.length > 0) {
		conditions.push(`match_type_shortname IN (${leagues.map(() => '?').join(',')})`);
		bindings.push(...leagues);
	}
	if (seasons.length > 0) {
		conditions.push(`season IN (${seasons.map(() => '?').join(',')})`);
		bindings.push(...seasons);
	}

	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
	const nullLast = dbSortCol === 'attendance' ? `CASE WHEN attendance IS NULL THEN 1 ELSE 0 END, ` : '';
	const orderBy = `ORDER BY ${nullLast}${dbSortCol} ${sortDir}`;

	try {
		const query = `
			SELECT
				match_id,
				round,
				match_type_shortname AS league,
				match_type_name AS leagueName,
				match_subtype_shortname AS type,
				match_subtype_name AS typeName,
				datetime,
				name AS matchName,
				home_team_id AS homeTeamId,
				home_team_shortcut AS homeTeamShort,
				away_team_id AS awayTeamId,
				away_team_shortcut AS awayTeamShort,
				home_match_score AS homeScore,
				away_match_score AS awayScore,
				home_match_tlt_score AS homeTotal,
				away_match_tlt_score AS awayTotal,
				attendance,
				season,
				track_city AS track
			FROM matches
			${where}
			${orderBy}
		`;

		const stmt = db.prepare(query);
		const result = await (bindings.length > 0 ? stmt.bind(...bindings) : stmt).all();

		return new Response(JSON.stringify({ schedule: result.results ?? [] }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('[schedule] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch schedule',
				details: error instanceof Error ? error.message : String(error),
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
