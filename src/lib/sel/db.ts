import postgres from 'postgres'

export function createSql(databaseUrl: string) {
	return postgres(databaseUrl, {
		prepare: false, // required for PgBouncer / Supabase transaction pooler
		connection: { search_path: 'sel' }, // all tables in sel schema; no prefix needed in SQL
	})
}
