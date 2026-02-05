import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals, url }) => {
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
		// Get query parameters
		const search = url.searchParams.get('search')?.toLowerCase() || '';
		const team = url.searchParams.get('team') || '';
		const league = url.searchParams.get('league') || '';
		const season = url.searchParams.get('season') || '';
		const sortColumn = url.searchParams.get('sortColumn') || '';
		const sortDirection = url.searchParams.get('sortDirection') || 'desc';

		// Build SQL query with filters
		let query = 'SELECT * FROM stats WHERE 1=1';
		const params: any[] = [];

		if (search) {
			query += ' AND LOWER(Name) LIKE ?';
			params.push(`%${search}%`);
		}

		if (team) {
			query += ' AND Team = ?';
			params.push(team);
		}

		if (league) {
			query += ' AND League = ?';
			params.push(league);
		}

		if (season) {
			query += ' AND Season = ?';
			params.push(parseInt(season));
		}

		// Add sorting
		if (sortColumn) {
			const validColumns = [
				'Season', 'Name', 'Team', 'Average', 'Match', 'Heats', 'Points', 
				'Bonus', 'Home Avg.', 'Away Avg.', 'I', 'II', 'III', 'IV', 'R', 
				'T', 'M', 'X', 'F', 'Warn', 'Max Speed', 'League'
			];
			
			if (validColumns.includes(sortColumn)) {
				const direction = sortDirection === 'asc' ? 'ASC' : 'DESC';
				// Handle columns with spaces or special characters
				const columnName = sortColumn.includes(' ') || sortColumn.includes('.') 
					? `"${sortColumn}"` 
					: sortColumn;
				query += ` ORDER BY ${columnName} ${direction}`;
			}
		}

		// Execute query
		const result = await db.prepare(query).bind(...params).all();
		const stats = result.results || [];

		return new Response(JSON.stringify({
			stats,
			totalCount: stats.length
		}), {
			status: 200,
			headers: { 
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
			}
		});
	} catch (error) {
		console.error('Database error:', error);
		return new Response(JSON.stringify({ 
			error: 'Failed to fetch stats',
			details: error instanceof Error ? error.message : String(error)
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
