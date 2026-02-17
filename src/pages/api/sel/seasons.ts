import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read SQL query once at module load time
const seasonsQuery = readFileSync(join(__dirname, 'queries', 'seasons.sql'), 'utf-8');

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
		const startTime = Date.now();
		const result = await db.prepare(seasonsQuery).all();
		console.log(`[seasons] Query time: ${Date.now() - startTime}ms`);
		const seasons = result.results?.map((row: any) => row.Season) || [];

		return new Response(JSON.stringify(seasons), {
			status: 200,
			headers: { 
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch (error) {
		console.error('Database error:', error);
		return new Response(JSON.stringify({ 
			error: 'Failed to fetch seasons'
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
