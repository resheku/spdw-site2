import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const GET: APIRoute = async () => {
	const db = env.DB;

	if (!db) {
		return new Response(JSON.stringify({ error: 'Database not available' }), {
			status: 503,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const result = await db
			.prepare(
				`
			SELECT DISTINCT
				m.season AS season,
				m.match_type_shortname AS code,
				m.match_type_name AS name
			FROM heats h
			JOIN matches m ON h.match_id = m.match_id
			WHERE
				h.gate IN ('a', 'b', 'c', 'd')
				AND h.canceled = 0
				AND h.points IS NOT NULL
			ORDER BY m.season DESC
		`
			)
			.all();

		const rows = result.results || [];
		const seasons = [...new Set(rows.map((r: Record<string, unknown>) => r.season as number))].sort(
			(a, b) => b - a
		);
		const leagueMap = new Map<string, string>();
		rows.forEach((r: Record<string, unknown>) => {
			if (!leagueMap.has(r.code as string)) leagueMap.set(r.code as string, r.name as string);
		});
		const leagues = [...leagueMap.entries()].map(([code, name]) => ({ code, name }));

		return new Response(JSON.stringify({ seasons, leagues }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300',
			},
		});
	} catch (error) {
		console.error('[tracks/gate-filters] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch gate filters',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
