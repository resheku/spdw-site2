import { createHandler } from '../../../../../lib/api';
import matchesQuery from '../../queries/track/matches.sql?params';

export const prerender = false;

export const GET = createHandler(async (sql, { params }) => {
	const track = params.track ?? '';

	if (!track) {
		return new Response(JSON.stringify({ error: 'Track not specified' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const rows = await matchesQuery(sql, track);
	return { matches: rows };
});
