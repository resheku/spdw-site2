import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const db = locals.runtime?.env?.DB;
	
	if (!db) {
		return new Response(JSON.stringify({ 
			error: 'Database not available' 
		}), {
			status: 503,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// Fetch all unique combinations of Team, League, Season
		const result = await db.prepare('SELECT DISTINCT Team, League, Season FROM stats ORDER BY Season DESC, Team ASC, League ASC').all();
		const rows = result.results || [];

		// Build comprehensive mapping structure
		const allTeams = new Set<string>();
		const allLeagues = new Set<string>();
		const allSeasons = new Set<number>();

		// Maps for relationships
		const byTeam: Record<string, { seasons: Set<number>, leagues: Set<string> }> = {};
		const bySeason: Record<number, { teams: Set<string>, leagues: Set<string> }> = {};
		const byLeague: Record<string, { teams: Set<string>, seasons: Set<number> }> = {};
		
		// Combinations: team+season -> leagues, team+league -> seasons, season+league -> teams
		const teamSeasonToLeagues: Record<string, Set<string>> = {};
		const teamLeagueToSeasons: Record<string, Set<number>> = {};
		const seasonLeagueToTeams: Record<string, Set<string>> = {};

		// Process all rows to build mappings
		rows.forEach((row: any) => {
			const team = row.Team;
			const league = row.League;
			const season = row.Season;

			if (!team || !league || !season) return;

			allTeams.add(team);
			allLeagues.add(league);
			allSeasons.add(season);

			// By Team
			if (!byTeam[team]) {
				byTeam[team] = { seasons: new Set(), leagues: new Set() };
			}
			byTeam[team].seasons.add(season);
			byTeam[team].leagues.add(league);

			// By Season
			if (!bySeason[season]) {
				bySeason[season] = { teams: new Set(), leagues: new Set() };
			}
			bySeason[season].teams.add(team);
			bySeason[season].leagues.add(league);

			// By League
			if (!byLeague[league]) {
				byLeague[league] = { teams: new Set(), seasons: new Set() };
			}
			byLeague[league].teams.add(team);
			byLeague[league].seasons.add(season);

			// Combinations
			const teamSeasonKey = `${team}:${season}`;
			if (!teamSeasonToLeagues[teamSeasonKey]) {
				teamSeasonToLeagues[teamSeasonKey] = new Set();
			}
			teamSeasonToLeagues[teamSeasonKey].add(league);

			const teamLeagueKey = `${team}:${league}`;
			if (!teamLeagueToSeasons[teamLeagueKey]) {
				teamLeagueToSeasons[teamLeagueKey] = new Set();
			}
			teamLeagueToSeasons[teamLeagueKey].add(season);

			const seasonLeagueKey = `${season}:${league}`;
			if (!seasonLeagueToTeams[seasonLeagueKey]) {
				seasonLeagueToTeams[seasonLeagueKey] = new Set();
			}
			seasonLeagueToTeams[seasonLeagueKey].add(team);
		});

		// Convert Sets to sorted arrays
		const filterMapping = {
			all: {
				teams: Array.from(allTeams).sort(),
				leagues: Array.from(allLeagues).sort(),
				seasons: Array.from(allSeasons).sort((a, b) => b - a)
			},
			byTeam: Object.fromEntries(
				Object.entries(byTeam).map(([team, data]) => [
					team,
					{
						seasons: Array.from(data.seasons).sort((a, b) => b - a),
						leagues: Array.from(data.leagues).sort()
					}
				])
			),
			bySeason: Object.fromEntries(
				Object.entries(bySeason).map(([season, data]) => [
					season,
					{
						teams: Array.from(data.teams).sort(),
						leagues: Array.from(data.leagues).sort()
					}
				])
			),
			byLeague: Object.fromEntries(
				Object.entries(byLeague).map(([league, data]) => [
					league,
					{
						teams: Array.from(data.teams).sort(),
						seasons: Array.from(data.seasons).sort((a, b) => b - a)
					}
				])
			),
			combinations: {
				teamSeason: Object.fromEntries(
					Object.entries(teamSeasonToLeagues).map(([key, leagues]) => [
						key,
						Array.from(leagues).sort()
					])
				),
				teamLeague: Object.fromEntries(
					Object.entries(teamLeagueToSeasons).map(([key, seasons]) => [
						key,
						Array.from(seasons).sort((a, b) => b - a)
					])
				),
				seasonLeague: Object.fromEntries(
					Object.entries(seasonLeagueToTeams).map(([key, teams]) => [
						key,
						Array.from(teams).sort()
					])
				)
			}
		};

		return new Response(JSON.stringify(filterMapping), {
			status: 200,
			headers: { 
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=600' // Cache for 10 minutes
			}
		});
	} catch (error) {
		console.error('Database error:', error);
		return new Response(JSON.stringify({ 
			error: 'Failed to fetch filter options',
			details: error instanceof Error ? error.message : String(error)
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
