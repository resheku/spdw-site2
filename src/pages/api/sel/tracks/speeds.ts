import { createHandler } from '../../../../lib/api';
import speedsQuery from '../queries/tracks/speeds.sql?raw';

export const prerender = false;

export const GET = createHandler(async (sql) => {
	const rows = await sql`${speedsQuery}`;

	const seasons: number[] = rows.length > 0 ? (rows[0].all_seasons as number[]) : [];
	const tracks = rows.map((r) => ({
		Track: r.track as string,
		Average: r.average as number | null,
		seasons: r.seasons as Record<string, number>,
	}));

	return { tracks, seasons };
});
