-- Simple fix for team deletion - Foreign Key Constraints Only
-- Since RLS is disabled, we only need to fix foreign key constraints

-- First, let's see what foreign key constraints currently exist
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

-- Now let's fix the constraints one by one
-- We'll use a more direct approach without checking if tables exist

-- 1. Fix users.team_id (SET NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'team_id'
    ) THEN
        -- Drop existing constraint if it exists
        ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_team_id_fkey;
        
        -- Add new constraint with ON DELETE SET NULL
        ALTER TABLE public.users 
        ADD CONSTRAINT users_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Fixed users.team_id constraint';
    ELSE
        RAISE NOTICE 'users.team_id column does not exist';
    END IF;
END $$;

-- 2. Fix holidays.team_id (CASCADE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'holidays' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE public.holidays DROP CONSTRAINT IF EXISTS holidays_team_id_fkey;
        
        ALTER TABLE public.holidays 
        ADD CONSTRAINT holidays_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed holidays.team_id constraint';
    ELSE
        RAISE NOTICE 'holidays.team_id column does not exist';
    END IF;
END $$;

-- 3. Fix practice_session_config.team_id (CASCADE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'practice_session_config' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE public.practice_session_config DROP CONSTRAINT IF EXISTS practice_session_config_team_id_fkey;
        
        ALTER TABLE public.practice_session_config 
        ADD CONSTRAINT practice_session_config_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed practice_session_config.team_id constraint';
    ELSE
        RAISE NOTICE 'practice_session_config.team_id column does not exist';
    END IF;
END $$;

-- 4. Fix discord_webhooks.team_id (CASCADE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'discord_webhooks' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE public.discord_webhooks DROP CONSTRAINT IF EXISTS discord_webhooks_team_id_fkey;
        
        ALTER TABLE public.discord_webhooks 
        ADD CONSTRAINT discord_webhooks_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed discord_webhooks.team_id constraint';
    ELSE
        RAISE NOTICE 'discord_webhooks.team_id column does not exist';
    END IF;
END $$;

-- 5. Fix communication_logs.team_id (CASCADE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communication_logs' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE public.communication_logs DROP CONSTRAINT IF EXISTS communication_logs_team_id_fkey;
        
        ALTER TABLE public.communication_logs 
        ADD CONSTRAINT communication_logs_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed communication_logs.team_id constraint';
    ELSE
        RAISE NOTICE 'communication_logs.team_id column does not exist';
    END IF;
END $$;

-- 6. Fix communication_settings.team_id (CASCADE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'communication_settings' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE public.communication_settings DROP CONSTRAINT IF EXISTS communication_settings_team_id_fkey;
        
        ALTER TABLE public.communication_settings 
        ADD CONSTRAINT communication_settings_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed communication_settings.team_id constraint';
    ELSE
        RAISE NOTICE 'communication_settings.team_id column does not exist';
    END IF;
END $$;

-- 7. Fix discord_servers.connected_team_id (SET NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'discord_servers' AND column_name = 'connected_team_id'
    ) THEN
        ALTER TABLE public.discord_servers DROP CONSTRAINT IF EXISTS discord_servers_connected_team_id_fkey;
        
        ALTER TABLE public.discord_servers 
        ADD CONSTRAINT discord_servers_connected_team_id_fkey 
        FOREIGN KEY (connected_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Fixed discord_servers.connected_team_id constraint';
    ELSE
        RAISE NOTICE 'discord_servers.connected_team_id column does not exist';
    END IF;
END $$;

-- 8. Fix performance_records.team_id (CASCADE)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'performance_records' AND column_name = 'team_id'
    ) THEN
        ALTER TABLE public.performance_records DROP CONSTRAINT IF EXISTS performance_records_team_id_fkey;
        
        ALTER TABLE public.performance_records 
        ADD CONSTRAINT performance_records_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Fixed performance_records.team_id constraint';
    ELSE
        RAISE NOTICE 'performance_records.team_id column does not exist';
    END IF;
END $$;

-- 9. Fix tryout_selections.assigned_team_id (SET NULL)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tryout_selections' AND column_name = 'assigned_team_id'
    ) THEN
        ALTER TABLE public.tryout_selections DROP CONSTRAINT IF EXISTS tryout_selections_assigned_team_id_fkey;
        
        ALTER TABLE public.tryout_selections 
        ADD CONSTRAINT tryout_selections_assigned_team_id_fkey 
        FOREIGN KEY (assigned_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Fixed tryout_selections.assigned_team_id constraint';
    ELSE
        RAISE NOTICE 'tryout_selections.assigned_team_id column does not exist';
    END IF;
END $$;

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