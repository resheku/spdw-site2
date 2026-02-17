import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read SQL queries once at module load time
const latestSeasonQuery = readFileSync(join(__dirname, 'queries', 'max-speeds-latest-season.sql'), 'utf-8');
const thisSeasonQuery = readFileSync(join(__dirname, 'queries', 'max-speeds-latest.sql'), 'utf-8');
const allTimeQuery = readFileSync(join(__dirname, 'queries', 'max-speeds-all-time.sql'), 'utf-8');

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
		
		// Get the latest season with telemetry data (PGEE league only)
		const seasonStart = Date.now();
		const latestSeasonResult = await db.prepare(latestSeasonQuery).first();
		console.log(`[max-speeds] Latest season query: ${Date.now() - seasonStart}ms`);
		
		const latestSeason = latestSeasonResult?.latest_season || new Date().getFullYear();
		
		// Execute both queries in parallel
		const queriesStart = Date.now();
		const [thisSeasonResult, allTimeResult] = await Promise.all([
			db.prepare(thisSeasonQuery).bind(latestSeason).all(),
			db.prepare(allTimeQuery).all()
		]);
		console.log(`[max-speeds] Both queries: ${Date.now() - queriesStart}ms`);

		const data = {
			thisSeason: thisSeasonResult.results || [],
			allTime: allTimeResult.results || []
		};

		console.log(`[max-speeds] Total time: ${Date.now() - startTime}ms`);

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { 
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300'
			}
		});
	} catch (error) {
		console.error('Database error:', error);
		return new Response(JSON.stringify({ 
			error: 'Failed to fetch max speeds',
			details: error instanceof Error ? error.message : String(error)
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
