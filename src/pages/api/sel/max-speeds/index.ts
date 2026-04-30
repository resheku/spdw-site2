import { createHandler } from '../../../../lib/api';

export const prerender = false;

const PAGE_SIZE = 50;

const validSortColumns: Record<string, string> = {
	Date: 'Date',
	Track: 'Track',
	Team: 'Team',
	Rider: 'Rider',
	Heat: 'Heat',
	'Max Speed': 'Max Speed',
	Points: 'Points',
	Gate: 'Gate',
	Season: 'Season',
	Match: 'Match',
	'Track Avg': 'Track Avg',
	'Diff': 'Diff',
	'Z-Score': 'Z-Score',
	'Speed Index': 'Speed Index',
};

export const GET = createHandler(
	async (sql, { url }) => {
		const search = url.searchParams.get('search')?.toLowerCase() || '';
		const teams = url.searchParams.get('team')?.split(',').filter(Boolean) || [];
		const leagues = url.searchParams.get('league')?.split(',').filter(Boolean) || [];
		const seasons = url.searchParams.get('season')?.split(',').filter(Boolean) || [];
		const tracks = url.searchParams.get('track')?.split(',').filter(Boolean) || [];
		const page = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10));
		const sortColumn = url.searchParams.get('sortColumn') || 'Max Speed';
		const sortDirection = url.searchParams.get('sortDirection') || 'desc';

		const safeColumn = validSortColumns[sortColumn] ?? 'Max Speed';
		const dirFrag = sortDirection === 'asc' ? sql`ASC` : sql`DESC`;

		const searchFrag = search
			? sql`AND LOWER(l.rider_name || ' ' || l.rider_surname) LIKE ${'%' + search + '%'}`
			: sql``;
		const teamFrag =
			teams.length > 0
				? sql`AND (
					(l.team_id = m.home_team_id AND m.home_team_shortcut = ANY(${teams}))
					OR
					(l.team_id = m.away_team_id AND m.away_team_shortcut = ANY(${teams}))
				)`
				: sql``;
		const leagueFrag =
			leagues.length > 0 ? sql`AND m.match_type_shortname = ANY(${leagues})` : sql``;
		const seasonFrag = seasons.length > 0 ? sql`AND m.season = ANY(${seasons.map(Number)})` : sql``;
		const trackFrag = tracks.length > 0 ? sql`AND m.track_city = ANY(${tracks})` : sql``;

		const offset = page * PAGE_SIZE;

		const [rows, countResult] = await Promise.all([
			sql`
			SELECT
				m.home_team_shortcut || ' vs ' || m.away_team_shortcut AS "Match",
				m.season AS "Season",
				SUBSTRING(m.datetime, 1, 10) AS "Date",
				m.track_city AS "Track",
				CASE
					WHEN l.team_id = m.home_team_id THEN m.home_team_shortcut
					ELSE m.away_team_shortcut
				END AS "Team",
				l.rider_name || ' ' || l.rider_surname AS "Rider",
				t.heat_no AS "Heat",
				t.max_speed AS "Max Speed",
				h.points AS "Points",
				UPPER(h.gate) AS "Gate",
				ts.track_mean_asof AS "Track Avg",
				t.max_speed - ts.track_mean_asof AS "Diff",
				CASE WHEN ts.track_stddev_asof > 0
					THEN (t.max_speed - ts.track_mean_asof) / ts.track_stddev_asof
					ELSE NULL END AS "Z-Score",
				t.max_speed / NULLIF(ts.track_mean_asof, 0) AS "Speed Index"
			FROM sel.telemetry t
			JOIN sel.matches m ON t.match_id = m.match_id
			JOIN sel.lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
			LEFT JOIN sel.heats h
				ON h.match_id = t.match_id
				AND h.heat_id = t.heat_id
				AND h.rider_id = t.rider_id
			JOIN sel.spdw_telemetry_stats ts ON ts.match_id = m.match_id
			WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
				${searchFrag}
				${teamFrag}
				${leagueFrag}
				${seasonFrag}
				${trackFrag}
			ORDER BY ${sql(safeColumn)} ${dirFrag} NULLS LAST
			LIMIT ${PAGE_SIZE}
			OFFSET ${offset}
		`,
			sql`
			SELECT COUNT(*) AS total
			FROM sel.telemetry t
			JOIN sel.matches m ON t.match_id = m.match_id
			JOIN sel.lineup l ON t.match_id = l.match_id AND t.rider_id = l.rider_id
			LEFT JOIN sel.heats h
				ON h.match_id = t.match_id
				AND h.heat_id = t.heat_id
				AND h.rider_id = t.rider_id
			WHERE t.max_speed IS NOT NULL AND t.max_speed > 0
				${searchFrag}
				${teamFrag}
				${leagueFrag}
				${seasonFrag}
				${trackFrag}
		`,
		]);

		const total = parseInt((countResult[0]?.total as string) ?? '0', 10) || 0;

		return { rows, total, page, pageSize: PAGE_SIZE };
	},
	{ cacheControl: 'public, max-age=60' }
);
