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
		// Fetch all unique filter values
		const result = await db.prepare('SELECT DISTINCT Team, League, Season FROM stats ORDER BY Season DESC, Team ASC, League ASC').all();
		const rows = result.results || [];

		const teamSet = new Set<string>();
		const leagueSet = new Set<string>();
		const seasonSet = new Set<number>();

		rows.forEach((row: any) => {
			if (row.Team) teamSet.add(row.Team);
			if (row.League) leagueSet.add(row.League);
			if (row.Season) seasonSet.add(row.Season);
		});

		const filterOptions = {
			teams: Array.from(teamSet).sort(),
			leagues: Array.from(leagueSet).sort(),
			seasons: Array.from(seasonSet).sort((a, b) => b - a) // descending
		};

		return new Response(JSON.stringify(filterOptions), {
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
