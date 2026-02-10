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
		// Get query parameters (comma-separated values for filters)
		const search = url.searchParams.get('search')?.toLowerCase() || '';
		const teams = url.searchParams.get('team')?.split(',').filter(Boolean) || [];
		const leagues = url.searchParams.get('league')?.split(',').filter(Boolean) || [];
		const seasons = url.searchParams.get('season')?.split(',').filter(Boolean) || [];
		const sortColumns = url.searchParams.get('sortColumn')?.split(',').filter(Boolean) || [];
		const sortDirections = url.searchParams.get('sortDirection')?.split(',').filter(Boolean) || [];

		// Build SQL query with filters
		let query = 'SELECT * FROM stats WHERE 1=1';
		const params: any[] = [];

		if (search) {
			query += ' AND LOWER(Name) LIKE ?';
			params.push(`%${search}%`);
		}

		if (teams.length > 0) {
			const teamConditions = teams.map(() => 'Team LIKE ?').join(' OR ');
			query += ` AND (${teamConditions})`;
			params.push(...teams.map(t => `%${t}%`));
		}

		if (leagues.length > 0) {
			query += ` AND League IN (${leagues.map(() => '?').join(', ')})`;
			params.push(...leagues);
		}

		if (seasons.length > 0) {
			query += ` AND Season IN (${seasons.map(() => '?').join(', ')})`;
			params.push(...seasons.map(s => parseInt(s)));
		}

		// Add sorting
		if (sortColumns.length > 0) {
			const validColumns = [
				'Season', 'Name', 'Team', 'Average', 'Match', 'Heats', 'Points', 
				'Bonus', 'Home Avg.', 'Away Avg.', 'I', 'II', 'III', 'IV', 'R', 
				'T', 'M', 'X', 'F', 'Warn', 'Max Speed', 'League'
			];
			
			const specialEmptyHandling = ['Average', 'Home Avg.', 'Away Avg.', 'Max Speed'];
			const orderClauses: string[] = [];
			
			sortColumns.forEach((column, index) => {
				if (validColumns.includes(column)) {
					const direction = (sortDirections[index] || 'desc') === 'asc' ? 'ASC' : 'DESC';
					const columnName = column.includes(' ') || column.includes('.') 
						? `"${column}"` 
						: column;
					
					// Add NULL handling for special columns
					if (specialEmptyHandling.includes(column)) {
						orderClauses.push(`CASE WHEN ${columnName} IS NULL THEN 1 ELSE 0 END`);
					}
					orderClauses.push(`${columnName} ${direction}`);
				}
			});
			
			if (orderClauses.length > 0) {
				query += ` ORDER BY ${orderClauses.join(', ')}`;
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
