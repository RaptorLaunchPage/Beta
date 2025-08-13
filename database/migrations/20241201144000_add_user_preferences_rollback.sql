-- Rollback for: add_user_preferences
-- This will undo the changes made in the migration

BEGIN;

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;

-- Drop the table
DROP TABLE IF EXISTS user_preferences CASCADE;

COMMIT;