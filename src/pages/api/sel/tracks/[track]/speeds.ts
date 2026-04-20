import { createHandler } from '../../../../../lib/api';
import matchAvgQuery from '../../queries/track/speeds-match-avg.sql?params';
import topSpeedsQuery from '../../queries/track/speeds-top.sql?params';

export const prerender = false;

export const GET = createHandler(async (sql, { params }) => {
	const track = params.track ?? '';

	if (!track) {
		return new Response(JSON.stringify({ error: 'Track not specified' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const [matchAvgRows, topSpeedRows] = await Promise.all([
		matchAvgQuery(sql, track),
		topSpeedsQuery(sql, track),
	]);
	return { matchAverages: matchAvgRows, topSpeeds: topSpeedRows };
});
