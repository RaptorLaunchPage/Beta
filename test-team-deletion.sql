-- Test script to identify which constraint is preventing team deletion
-- Run this to see the exact error

-- First, let's see what teams exist
SELECT id, name, status FROM teams LIMIT 5;

-- Let's check which tables have data related to a specific team
-- Replace 'YOUR_TEAM_ID_HERE' with an actual team ID from the above query

-- Check users table
SELECT COUNT(*) as user_count FROM users WHERE team_id IS NOT NULL;

-- Check if there are any users with team_id
SELECT id, name, team_id FROM users WHERE team_id IS NOT NULL LIMIT 5;

-- Check other tables that might have team references
-- (Only check tables that actually exist)

-- Check if holidays table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'holidays') THEN
        RAISE NOTICE 'holidays table exists';
        PERFORM COUNT(*) FROM holidays WHERE team_id IS NOT NULL;
        RAISE NOTICE 'holidays with team_id: %', (SELECT COUNT(*) FROM holidays WHERE team_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'holidays table does not exist';
    END IF;
END $$;

-- Check if practice_session_config table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'practice_session_config') THEN
        RAISE NOTICE 'practice_session_config table exists';
        PERFORM COUNT(*) FROM practice_session_config WHERE team_id IS NOT NULL;
        RAISE NOTICE 'practice_session_config with team_id: %', (SELECT COUNT(*) FROM practice_session_config WHERE team_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'practice_session_config table does not exist';
    END IF;
END $$;

-- Check if discord_webhooks table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discord_webhooks') THEN
        RAISE NOTICE 'discord_webhooks table exists';
        PERFORM COUNT(*) FROM discord_webhooks WHERE team_id IS NOT NULL;
        RAISE NOTICE 'discord_webhooks with team_id: %', (SELECT COUNT(*) FROM discord_webhooks WHERE team_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'discord_webhooks table does not exist';
    END IF;
END $$;

-- Check if communication_logs table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communication_logs') THEN
        RAISE NOTICE 'communication_logs table exists';
        PERFORM COUNT(*) FROM communication_logs WHERE team_id IS NOT NULL;
        RAISE NOTICE 'communication_logs with team_id: %', (SELECT COUNT(*) FROM communication_logs WHERE team_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'communication_logs table does not exist';
    END IF;
END $$;

-- Check if communication_settings table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communication_settings') THEN
        RAISE NOTICE 'communication_settings table exists';
        PERFORM COUNT(*) FROM communication_settings WHERE team_id IS NOT NULL;
        RAISE NOTICE 'communication_settings with team_id: %', (SELECT COUNT(*) FROM communication_settings WHERE team_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'communication_settings table does not exist';
    END IF;
END $$;

-- Check if discord_servers table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discord_servers') THEN
        RAISE NOTICE 'discord_servers table exists';
        PERFORM COUNT(*) FROM discord_servers WHERE connected_team_id IS NOT NULL;
        RAISE NOTICE 'discord_servers with connected_team_id: %', (SELECT COUNT(*) FROM discord_servers WHERE connected_team_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'discord_servers table does not exist';
    END IF;
END $$;

-- Check if performance_records table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_records') THEN
        RAISE NOTICE 'performance_records table exists';
        PERFORM COUNT(*) FROM performance_records WHERE team_id IS NOT NULL;
        RAISE NOTICE 'performance_records with team_id: %', (SELECT COUNT(*) FROM performance_records WHERE team_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'performance_records table does not exist';
    END IF;
END $$;

-- Check if tryout_selections table exists and has team data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tryout_selections') THEN
        RAISE NOTICE 'tryout_selections table exists';
        PERFORM COUNT(*) FROM tryout_selections WHERE assigned_team_id IS NOT NULL;
        RAISE NOTICE 'tryout_selections with assigned_team_id: %', (SELECT COUNT(*) FROM tryout_selections WHERE assigned_team_id IS NOT NULL);
    ELSE
        RAISE NOTICE 'tryout_selections table does not exist';
    END IF;
END $$;

-- Now let's try to delete a team and see what happens
-- Replace 'YOUR_TEAM_ID_HERE' with an actual team ID
-- DELETE FROM teams WHERE id = 'YOUR_TEAM_ID_HERE';

-- Or let's see what happens when we try to delete the first team
-- (This will show the exact error)
-- DELETE FROM teams WHERE id = (SELECT id FROM teams LIMIT 1);