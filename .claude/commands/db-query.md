Execute Supabase database query: $ARGUMENTS

Steps:
1. Parse the SQL query from $ARGUMENTS
2. Use mcp__supabase__execute_sql tool with project_id: giluhqotfjpmofowvogn
3. If it's a DDL operation, also create a migration file in supabase/migrations/
4. Show the query result
5. If RLS policies are involved, verify they're properly set
