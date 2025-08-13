-- Migration Management Functions for Supabase
-- These functions support the migration script

-- Function to create the migration tracking table
CREATE OR REPLACE FUNCTION create_migration_table(table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create the migration tracking table if it doesn't exist
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I (
            id SERIAL PRIMARY KEY,
            migration_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    ', table_name);
    
    -- Create index for faster lookups
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_migration_id ON %I (migration_id)
    ', table_name, table_name);
    
    -- Create index for ordering
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS idx_%I_applied_at ON %I (applied_at)
    ', table_name, table_name);
END;
$$;

-- Function to execute SQL safely with transaction support
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Execute the provided SQL
    EXECUTE sql_query;
END;
$$;

-- Function to check if a migration has been applied
CREATE OR REPLACE FUNCTION is_migration_applied(migration_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    exists_count integer;
BEGIN
    SELECT COUNT(*) INTO exists_count
    FROM schema_migrations
    WHERE migration_id = $1;
    
    RETURN exists_count > 0;
END;
$$;

-- Function to get all applied migrations
CREATE OR REPLACE FUNCTION get_applied_migrations()
RETURNS TABLE(migration_id text, name text, applied_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT sm.migration_id, sm.name, sm.applied_at
    FROM schema_migrations sm
    ORDER BY sm.applied_at;
END;
$$;

-- Function to record a migration as applied
CREATE OR REPLACE FUNCTION record_migration(migration_id text, migration_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO schema_migrations (migration_id, name, applied_at)
    VALUES (migration_id, migration_name, NOW())
    ON CONFLICT (migration_id) DO NOTHING;
END;
$$;

-- Function to remove a migration record (for rollbacks)
CREATE OR REPLACE FUNCTION remove_migration(migration_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM schema_migrations
    WHERE migration_id = $1;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count > 0;
END;
$$;

-- Grant necessary permissions to the authenticated role
GRANT EXECUTE ON FUNCTION create_migration_table(text) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION is_migration_applied(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_applied_migrations() TO authenticated;
GRANT EXECUTE ON FUNCTION record_migration(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_migration(text) TO authenticated;

-- Grant permissions on the migration table
GRANT ALL ON TABLE schema_migrations TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE schema_migrations_id_seq TO authenticated;