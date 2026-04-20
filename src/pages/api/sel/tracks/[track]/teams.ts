import { createHandler } from '../../../../../lib/api';
import summaryQuery from '../../queries/track/teams-summary.sql?params';
import byTeamQuery from '../../queries/track/teams-by-team.sql?params';

export const prerender = false;

export const GET = createHandler(async (sql, { params }) => {
	const track = params.track ?? '';

	if (!track) {
		return new Response(JSON.stringify({ error: 'Track not specified' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const [summaryRows, teamRows] = await Promise.all([
		summaryQuery(sql, track),
		byTeamQuery(sql, track),
	]);

	return { summary: summaryRows[0] ?? null, teams: teamRows };
});
