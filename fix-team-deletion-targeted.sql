-- Targeted fix for team deletion - based on actual database schema
-- This script fixes only the foreign key constraints that are missing ON DELETE clauses

-- First, let's see the current foreign key constraints to teams
SELECT 
    tc.table_name, 
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'teams'
    AND ccu.column_name = 'id'
ORDER BY tc.table_name, tc.constraint_name;

-- Now fix the constraints that are missing ON DELETE clauses
-- Based on the schema, these constraints exist but don't have ON DELETE specified

-- 1. Fix users.team_id (SET NULL - users should persist but lose team association)
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_team_id_fkey;

ALTER TABLE public.users 
ADD CONSTRAINT users_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- 2. Fix attendances.team_id (CASCADE - attendance records should be deleted with team)
ALTER TABLE public.attendances 
DROP CONSTRAINT IF EXISTS attendances_team_id_fkey;

ALTER TABLE public.attendances 
ADD CONSTRAINT attendances_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 3. Fix communication_logs.team_id (CASCADE - communication logs should be deleted with team)
ALTER TABLE public.communication_logs 
DROP CONSTRAINT IF EXISTS communication_logs_team_id_fkey;

ALTER TABLE public.communication_logs 
ADD CONSTRAINT communication_logs_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 4. Fix communication_settings.team_id (CASCADE - settings should be deleted with team)
ALTER TABLE public.communication_settings 
DROP CONSTRAINT IF EXISTS communication_settings_team_id_fkey;

ALTER TABLE public.communication_settings 
ADD CONSTRAINT communication_settings_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 5. Fix discord_servers.connected_team_id (SET NULL - servers should persist but lose team connection)
ALTER TABLE public.discord_servers 
DROP CONSTRAINT IF EXISTS discord_servers_connected_team_id_fkey;

ALTER TABLE public.discord_servers 
ADD CONSTRAINT discord_servers_connected_team_id_fkey 
FOREIGN KEY (connected_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- 6. Fix discord_webhooks.team_id (CASCADE - webhooks should be deleted with team)
ALTER TABLE public.discord_webhooks 
DROP CONSTRAINT IF EXISTS discord_webhooks_team_id_fkey;

ALTER TABLE public.discord_webhooks 
ADD CONSTRAINT discord_webhooks_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 7. Fix holidays.team_id (CASCADE - holidays should be deleted with team)
ALTER TABLE public.holidays 
DROP CONSTRAINT IF EXISTS holidays_team_id_fkey;

ALTER TABLE public.holidays 
ADD CONSTRAINT holidays_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 8. Fix performances.team_id (CASCADE - performances should be deleted with team)
ALTER TABLE public.performances 
DROP CONSTRAINT IF EXISTS performances_team_id_fkey;

ALTER TABLE public.performances 
ADD CONSTRAINT performances_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 9. Fix practice_session_config.team_id (CASCADE - config should be deleted with team)
ALTER TABLE public.practice_session_config 
DROP CONSTRAINT IF EXISTS practice_session_config_team_id_fkey;

ALTER TABLE public.practice_session_config 
ADD CONSTRAINT practice_session_config_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 10. Fix rosters.team_id (CASCADE - roster entries should be deleted with team)
ALTER TABLE public.rosters 
DROP CONSTRAINT IF EXISTS rosters_team_id_fkey;

ALTER TABLE public.rosters 
ADD CONSTRAINT rosters_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 11. Fix sessions.team_id (CASCADE - sessions should be deleted with team)
ALTER TABLE public.sessions 
DROP CONSTRAINT IF EXISTS sessions_team_id_fkey;

ALTER TABLE public.sessions 
ADD CONSTRAINT sessions_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 12. Fix slot_expenses.team_id (CASCADE - expenses should be deleted with team)
ALTER TABLE public.slot_expenses 
DROP CONSTRAINT IF EXISTS slot_expenses_team_id_fkey;

ALTER TABLE public.slot_expenses 
ADD CONSTRAINT slot_expenses_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 13. Fix slots.team_id (CASCADE - slots should be deleted with team)
ALTER TABLE public.slots 
DROP CONSTRAINT IF EXISTS slots_team_id_fkey;

ALTER TABLE public.slots 
ADD CONSTRAINT slots_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 14. Fix team_monthly_stats.team_id (CASCADE - stats should be deleted with team)
ALTER TABLE public.team_monthly_stats 
DROP CONSTRAINT IF EXISTS team_monthly_stats_team_id_fkey;

ALTER TABLE public.team_monthly_stats 
ADD CONSTRAINT team_monthly_stats_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 15. Fix tryout_selections.assigned_team_id (SET NULL - selections should persist but lose team assignment)
ALTER TABLE public.tryout_selections 
DROP CONSTRAINT IF EXISTS tryout_selections_assigned_team_id_fkey;

ALTER TABLE public.tryout_selections 
ADD CONSTRAINT tryout_selections_assigned_team_id_fkey 
FOREIGN KEY (assigned_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- 16. Fix winnings.team_id (CASCADE - winnings should be deleted with team)
ALTER TABLE public.winnings 
DROP CONSTRAINT IF EXISTS winnings_team_id_fkey;

ALTER TABLE public.winnings 
ADD CONSTRAINT winnings_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- Verify the changes
SELECT 
    tc.table_name, 
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'teams'
    AND ccu.column_name = 'id'
ORDER BY tc.table_name, tc.constraint_name;

-- Test team deletion (uncomment to test)
-- DELETE FROM teams WHERE id = (SELECT id FROM teams LIMIT 1);