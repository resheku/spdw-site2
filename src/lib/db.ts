import postgres from 'postgres';
import { env } from 'cloudflare:workers';

export function getDb() {
	return postgres(env.HYPERDRIVE.connectionString);
}
