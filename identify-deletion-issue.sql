-- Identify which constraint is preventing team deletion
-- This script will show you exactly which tables have data that would prevent team deletion

-- First, let's see what teams exist
SELECT id, name, status FROM teams LIMIT 5;

-- Now let's check which tables have data that references teams
-- We'll check each table that might have team references

-- 1. Check users table
SELECT 'users' as table_name, COUNT(*) as record_count 
FROM users WHERE team_id IS NOT NULL;

-- 2. Check if holidays table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'holidays') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'holidays' AND column_name = 'team_id') THEN
            RAISE NOTICE 'holidays table: % records with team_id', (SELECT COUNT(*) FROM holidays WHERE team_id IS NOT NULL);
        ELSE
            RAISE NOTICE 'holidays table exists but has no team_id column';
        END IF;
    ELSE
        RAISE NOTICE 'holidays table does not exist';
    END IF;
END $$;

-- 3. Check if practice_session_config table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'practice_session_config') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'practice_session_config' AND column_name = 'team_id') THEN
            RAISE NOTICE 'practice_session_config table: % records with team_id', (SELECT COUNT(*) FROM practice_session_config WHERE team_id IS NOT NULL);
        ELSE
            RAISE NOTICE 'practice_session_config table exists but has no team_id column';
        END IF;
    ELSE
        RAISE NOTICE 'practice_session_config table does not exist';
    END IF;
END $$;

-- 4. Check if discord_webhooks table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discord_webhooks') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discord_webhooks' AND column_name = 'team_id') THEN
            RAISE NOTICE 'discord_webhooks table: % records with team_id', (SELECT COUNT(*) FROM discord_webhooks WHERE team_id IS NOT NULL);
        ELSE
            RAISE NOTICE 'discord_webhooks table exists but has no team_id column';
        END IF;
    ELSE
        RAISE NOTICE 'discord_webhooks table does not exist';
    END IF;
END $$;

-- 5. Check if communication_logs table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communication_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communication_logs' AND column_name = 'team_id') THEN
            RAISE NOTICE 'communication_logs table: % records with team_id', (SELECT COUNT(*) FROM communication_logs WHERE team_id IS NOT NULL);
        ELSE
            RAISE NOTICE 'communication_logs table exists but has no team_id column';
        END IF;
    ELSE
        RAISE NOTICE 'communication_logs table does not exist';
    END IF;
END $$;

-- 6. Check if communication_settings table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communication_settings') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communication_settings' AND column_name = 'team_id') THEN
            RAISE NOTICE 'communication_settings table: % records with team_id', (SELECT COUNT(*) FROM communication_settings WHERE team_id IS NOT NULL);
        ELSE
            RAISE NOTICE 'communication_settings table exists but has no team_id column';
        END IF;
    ELSE
        RAISE NOTICE 'communication_settings table does not exist';
    END IF;
END $$;

-- 7. Check if discord_servers table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discord_servers') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discord_servers' AND column_name = 'connected_team_id') THEN
            RAISE NOTICE 'discord_servers table: % records with connected_team_id', (SELECT COUNT(*) FROM discord_servers WHERE connected_team_id IS NOT NULL);
        ELSE
            RAISE NOTICE 'discord_servers table exists but has no connected_team_id column';
        END IF;
    ELSE
        RAISE NOTICE 'discord_servers table does not exist';
    END IF;
END $$;

-- 8. Check if performance_records table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_records') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performance_records' AND column_name = 'team_id') THEN
            RAISE NOTICE 'performance_records table: % records with team_id', (SELECT COUNT(*) FROM performance_records WHERE team_id IS NOT NULL);
        ELSE
            RAISE NOTICE 'performance_records table exists but has no team_id column';
        END IF;
    ELSE
        RAISE NOTICE 'performance_records table does not exist';
    END IF;
END $$;

-- 9. Check if tryout_selections table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tryout_selections') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tryout_selections' AND column_name = 'assigned_team_id') THEN
            RAISE NOTICE 'tryout_selections table: % records with assigned_team_id', (SELECT COUNT(*) FROM tryout_selections WHERE assigned_team_id IS NOT NULL);
        ELSE
            RAISE NOTICE 'tryout_selections table exists but has no assigned_team_id column';
        END IF;
    ELSE
        RAISE NOTICE 'tryout_selections table does not exist';
    END IF;
END $$;

-- Now let's try to delete a team and see the exact error
-- Uncomment the line below to test deletion (replace with an actual team ID)
-- DELETE FROM teams WHERE id = 'YOUR_TEAM_ID_HERE';

-- Or try to delete the first team to see the error
-- DELETE FROM teams WHERE id = (SELECT id FROM teams LIMIT 1);