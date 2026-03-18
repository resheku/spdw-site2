import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const db = locals.runtime?.env?.DB;

	if (!db) {
		return new Response(JSON.stringify({ error: 'Database not available' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const [leaguesResult, seasonsResult] = await Promise.all([
			db
				.prepare(
					`SELECT DISTINCT match_type_shortname AS shortname, match_type_name AS name
					 FROM matches ORDER BY match_type_name`
				)
				.all(),
			db
				.prepare(`SELECT DISTINCT season FROM matches ORDER BY season ASC`)
				.all(),
		]);

		const leagues = (leaguesResult.results ?? []).map((r: any) => ({
			shortname: r.shortname,
			name: r.name,
		}));
		const seasons = (seasonsResult.results ?? []).map((r: any) => r.season);

		return new Response(JSON.stringify({ leagues, seasons }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=3600',
			},
		});
	} catch (error) {
		console.error('[schedule/filters] Error:', error);
		return new Response(
			JSON.stringify({ error: 'Failed to fetch schedule filters' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
