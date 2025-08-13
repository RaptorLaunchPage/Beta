-- Rollback for: initial_schema_setup
-- This will drop all tables and types created in the initial migration

BEGIN;

-- Drop triggers first
DROP TRIGGER IF EXISTS update_discord_settings_updated_at ON discord_settings;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order (due to foreign key dependencies)
DROP TABLE IF EXISTS discord_settings CASCADE;
DROP TABLE IF EXISTS tryout_applications CASCADE;
DROP TABLE IF EXISTS winnings CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
DROP TABLE IF EXISTS performances CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS source_type CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS attendance_status CASCADE;
DROP TYPE IF EXISTS session_type CASCADE;
DROP TYPE IF EXISTS team_status CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

COMMIT;