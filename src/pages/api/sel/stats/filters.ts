import { createHandler } from '../../../../lib/api';

export const prerender = false;

export const GET = createHandler(
	async (sql, { url }) => {
		// Get query parameters for heats range (exclude heats itself when computing range)
		const teams = url.searchParams.get('team')?.split(',').filter(Boolean) || [];
		const leagues = url.searchParams.get('league')?.split(',').filter(Boolean) || [];
		const seasons = url.searchParams.get('season')?.split(',').filter(Boolean) || [];

		// Fetch all unique combinations of Team, League, Season
		const rows = await sql`
		SELECT DISTINCT "Team", "League", "Season"
		FROM sel.stats
		ORDER BY "Season" DESC, "Team" ASC, "League" ASC
	`;

		const teamFrag =
			teams.length > 0 ? sql`AND "Team" LIKE ANY(${teams.map((t) => '%' + t + '%')})` : sql``;
		const leagueFrag = leagues.length > 0 ? sql`AND "League" = ANY(${leagues})` : sql``;
		const seasonFrag = seasons.length > 0 ? sql`AND "Season" = ANY(${seasons.map(Number)})` : sql``;

		const [heatsResult] = await sql`
		SELECT MIN("Heats") AS "minHeats", MAX("Heats") AS "maxHeats"
		FROM sel.stats
		WHERE "Heats" IS NOT NULL AND "Heats" > 0
			${teamFrag}
			${leagueFrag}
			${seasonFrag}
	`;
		const heatsRange = {
			min: (heatsResult?.minHeats as number) || 0,
			max: (heatsResult?.maxHeats as number) || 100,
		};

		// Build comprehensive mapping structure
		const allTeams = new Set<string>();
		const allLeagues = new Set<string>();
		const allSeasons = new Set<number>();

		// Maps for relationships
		const byTeam: Record<string, { seasons: Set<number>; leagues: Set<string> }> = {};
		const bySeason: Record<number, { teams: Set<string>; leagues: Set<string> }> = {};
		const byLeague: Record<string, { teams: Set<string>; seasons: Set<number> }> = {};

		// Combinations: team+season -> leagues, team+league -> seasons, season+league -> teams
		const teamSeasonToLeagues: Record<string, Set<string>> = {};
		const teamLeagueToSeasons: Record<string, Set<number>> = {};
		const seasonLeagueToTeams: Record<string, Set<string>> = {};

		// Process all rows to build mappings
		rows.forEach((row) => {
			const teamValue = row.Team as string;
			const league = row.League as string;
			const season = row.Season as number;

			if (!teamValue || !league || !season) return;

			// Split combined team values (e.g., "TAR/GOR" becomes ["TAR", "GOR"])
			const individualTeams = teamValue.split('/').map((t: string) => t.trim());

			individualTeams.forEach((team: string) => {
				allTeams.add(team);

				// By Team
				if (!byTeam[team]) {
					byTeam[team] = { seasons: new Set(), leagues: new Set() };
				}
				byTeam[team].seasons.add(season);
				byTeam[team].leagues.add(league);

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
			});

			allLeagues.add(league);
			allSeasons.add(season);

			// By Season - add individual teams to season mapping
			if (!bySeason[season]) {
				bySeason[season] = { teams: new Set(), leagues: new Set() };
			}
			individualTeams.forEach((team: string) => {
				bySeason[season].teams.add(team);
			});
			bySeason[season].leagues.add(league);

			// By League - add individual teams to league mapping
			if (!byLeague[league]) {
				byLeague[league] = { teams: new Set(), seasons: new Set() };
			}
			individualTeams.forEach((team: string) => {
				byLeague[league].teams.add(team);
			});
			byLeague[league].seasons.add(season);

			// Season+League combinations
			const seasonLeagueKey = `${season}:${league}`;
			if (!seasonLeagueToTeams[seasonLeagueKey]) {
				seasonLeagueToTeams[seasonLeagueKey] = new Set();
			}
			individualTeams.forEach((team: string) => {
				seasonLeagueToTeams[seasonLeagueKey].add(team);
			});
		});

		// Convert Sets to sorted arrays
		const filterMapping = {
			all: {
				teams: Array.from(allTeams).sort(),
				leagues: Array.from(allLeagues).sort(),
				seasons: Array.from(allSeasons).sort((a, b) => b - a),
			},
			byTeam: Object.fromEntries(
				Object.entries(byTeam).map(([team, data]) => [
					team,
					{
						seasons: Array.from(data.seasons).sort((a, b) => b - a),
						leagues: Array.from(data.leagues).sort(),
					},
				])
			),
			bySeason: Object.fromEntries(
				Object.entries(bySeason).map(([season, data]) => [
					season,
					{
						teams: Array.from(data.teams).sort(),
						leagues: Array.from(data.leagues).sort(),
					},
				])
			),
			byLeague: Object.fromEntries(
				Object.entries(byLeague).map(([league, data]) => [
					league,
					{
						teams: Array.from(data.teams).sort(),
						seasons: Array.from(data.seasons).sort((a, b) => b - a),
					},
				])
			),
			combinations: {
				teamSeason: Object.fromEntries(
					Object.entries(teamSeasonToLeagues).map(([key, leagues]) => [
						key,
						Array.from(leagues).sort(),
					])
				),
				teamLeague: Object.fromEntries(
					Object.entries(teamLeagueToSeasons).map(([key, seasons]) => [
						key,
						Array.from(seasons).sort((a, b) => b - a),
					])
				),
				seasonLeague: Object.fromEntries(
					Object.entries(seasonLeagueToTeams).map(([key, teams]) => [key, Array.from(teams).sort()])
				),
			},
			heatsRange,
		};

		return filterMapping;
	},
	{ cacheControl: 'public, max-age=600' }
);
