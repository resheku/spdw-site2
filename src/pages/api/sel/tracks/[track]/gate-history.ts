import type { APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import avgBase from '../../queries/track/gate-history-avg-base.sql?raw';
import winBase from '../../queries/track/gate-history-win-base.sql?raw';
import overallAvgBase from '../../queries/track/gate-history-overall-avg-base.sql?raw';
import overallWinBase from '../../queries/track/gate-history-overall-win-base.sql?raw';
import leaguesQuery from '../../queries/track/gate-history-leagues.sql?raw';

export const prerender = false;

export const GET: APIRoute = async ({ url, params }) => {
	const track = params.track ?? '';

	if (!track) {
		return new Response(JSON.stringify({ error: 'Track not specified' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (!env.HYPERDRIVE?.connectionString) {
		return new Response('Hyperdrive not bound', { status: 500 });
	}
	const sql = postgres(env.HYPERDRIVE.connectionString)
	const leagueParam = url.searchParams.get('league');
	const selectedLeagues = leagueParam ? leagueParam.split(',').filter(Boolean) : [];

	const leagueCond = selectedLeagues.length
		? sql`AND m.match_type_shortname = ANY(${selectedLeagues})`
		: sql``;

	try {
		const [avgRows, winRows, overallAvgRows, overallWinRows, leagueRows] = await Promise.all([
			sql`
				${sql.unsafe(avgBase)}
				AND m.track_city = ${track}
				${leagueCond}
				GROUP BY m.season
				ORDER BY m.season
			`,
			sql`
				${sql.unsafe(winBase)}
				AND m.track_city = ${track}
				${leagueCond}
				GROUP BY m.season
				ORDER BY m.season
			`,
			sql`
				${sql.unsafe(overallAvgBase)}
				AND m.track_city = ${track}
				${leagueCond}
			`,
			sql`
				${sql.unsafe(overallWinBase)}
				AND m.track_city = ${track}
				${leagueCond}
			`,
			sql.unsafe(leaguesQuery, [track]),
		]);

		const oa = (overallAvgRows[0] as Record<string, number | null>) ?? {};
		const ow = (overallWinRows[0] as Record<string, number | null>) ?? {};

		const overallAvgBias =
			oa.A != null && oa.B != null && oa.C != null && oa.D != null
				? parseFloat(
						(Math.max(oa.A, oa.B, oa.C, oa.D) - Math.min(oa.A, oa.B, oa.C, oa.D)).toFixed(2)
					)
				: null;
		const overallWinBias =
			ow.A != null && ow.B != null && ow.C != null && ow.D != null
				? parseFloat(
						(Math.max(ow.A, ow.B, ow.C, ow.D) - Math.min(ow.A, ow.B, ow.C, ow.D)).toFixed(1)
					)
				: null;

		const toNum = (v: number | null | undefined) => (v != null ? +v : null);

		// Cast per-season rows (postgres NUMERIC arrives as strings)
		const avgRowsCast = (avgRows as Record<string, unknown>[]).map((r) => ({
			season: r.season,
			A: toNum(r.A as number | null),
			B: toNum(r.B as number | null),
			C: toNum(r.C as number | null),
			D: toNum(r.D as number | null),
		}));
		const winRowsCast = (winRows as Record<string, unknown>[]).map((r) => ({
			season: r.season,
			A: toNum(r.A as number | null),
			B: toNum(r.B as number | null),
			C: toNum(r.C as number | null),
			D: toNum(r.D as number | null),
		}));

		return new Response(
			JSON.stringify({
				avgPoints: avgRowsCast,
				winPct: winRowsCast,
				overall: {
					avgPoints: {
						A: toNum(oa.A),
						B: toNum(oa.B),
						C: toNum(oa.C),
						D: toNum(oa.D),
						'AC/BD':
							oa.A != null && oa.B != null && oa.C != null && oa.D != null
								? `${(+oa.A + +oa.C).toFixed(2)}/${(+oa.B + +oa.D).toFixed(2)}`
								: null,
						Bias: overallAvgBias,
					},
					winPct: {
						A: toNum(ow.A),
						B: toNum(ow.B),
						C: toNum(ow.C),
						D: toNum(ow.D),
						Bias: overallWinBias,
					},
				},
				leagues: leagueRows,
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=300',
				},
			}
		);
	} catch (error) {
		console.error('[track/gate-history] Error:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to fetch gate history',
				details: error instanceof Error ? error.message : String(error),
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};
