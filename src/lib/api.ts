import type { APIContext, APIRoute } from 'astro';
import postgres from 'postgres';
import { env } from 'cloudflare:workers';
import { getDb } from './db';

type Sql = ReturnType<typeof postgres>;

export function createHandler(
	fn: (sql: Sql, ctx: APIContext) => Promise<unknown>,
	options?: { cacheControl?: string }
): APIRoute {
	return async (ctx) => {
		if (!env.HYPERDRIVE?.connectionString) {
			return new Response('Hyperdrive not bound', { status: 500 });
		}
		const sql = getDb();
		try {
			const result = await fn(sql, ctx);
			if (result instanceof Response) return result;
			return new Response(JSON.stringify(result), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': options?.cacheControl ?? 'public, max-age=300',
				},
			});
		} catch (error) {
			console.error(error);
			return new Response(
				JSON.stringify({
					error: 'Internal server error',
					details: error instanceof Error ? error.message : String(error),
				}),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
	};
}
