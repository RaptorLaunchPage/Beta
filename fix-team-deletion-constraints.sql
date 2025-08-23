-- Fix foreign key constraints to allow team deletion
-- This script adds ON DELETE CASCADE clauses to foreign key constraints that reference teams.id

-- 1. Fix users.team_id foreign key constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_team_id_fkey;

ALTER TABLE public.users 
ADD CONSTRAINT users_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- 2. Fix holidays.team_id foreign key constraint
ALTER TABLE public.holidays 
DROP CONSTRAINT IF EXISTS holidays_team_id_fkey;

ALTER TABLE public.holidays 
ADD CONSTRAINT holidays_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 3. Fix practice_session_config.team_id foreign key constraint
ALTER TABLE public.practice_session_config 
DROP CONSTRAINT IF EXISTS practice_session_config_team_id_fkey;

ALTER TABLE public.practice_session_config 
ADD CONSTRAINT practice_session_config_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 4. Fix discord_webhooks.team_id foreign key constraint
ALTER TABLE public.discord_webhooks 
DROP CONSTRAINT IF EXISTS discord_webhooks_team_id_fkey;

ALTER TABLE public.discord_webhooks 
ADD CONSTRAINT discord_webhooks_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 5. Fix communication_logs.team_id foreign key constraint
ALTER TABLE public.communication_logs 
DROP CONSTRAINT IF EXISTS communication_logs_team_id_fkey;

ALTER TABLE public.communication_logs 
ADD CONSTRAINT communication_logs_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 6. Fix communication_settings.team_id foreign key constraint
ALTER TABLE public.communication_settings 
DROP CONSTRAINT IF EXISTS communication_settings_team_id_fkey;

ALTER TABLE public.communication_settings 
ADD CONSTRAINT communication_settings_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 7. Fix discord_servers.connected_team_id foreign key constraint
ALTER TABLE public.discord_servers 
DROP CONSTRAINT IF EXISTS discord_servers_connected_team_id_fkey;

ALTER TABLE public.discord_servers 
ADD CONSTRAINT discord_servers_connected_team_id_fkey 
FOREIGN KEY (connected_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- 8. Fix performance_records.team_id foreign key constraint
ALTER TABLE public.performance_records 
DROP CONSTRAINT IF EXISTS performance_records_team_id_fkey;

ALTER TABLE public.performance_records 
ADD CONSTRAINT performance_records_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 9. Fix tryout_selections.assigned_team_id foreign key constraint
ALTER TABLE public.tryout_selections 
DROP CONSTRAINT IF EXISTS tryout_selections_assigned_team_id_fkey;

ALTER TABLE public.tryout_selections 
ADD CONSTRAINT tryout_selections_assigned_team_id_fkey 
FOREIGN KEY (assigned_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- ====================================================================
-- FIX RLS POLICIES FOR TEAM DELETION
-- ====================================================================

-- Add DELETE policy for teams table
DROP POLICY IF EXISTS "Admins and managers can delete teams" ON public.teams;

CREATE POLICY "Admins and managers can delete teams" ON public.teams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Add UPDATE policy for teams table (if not exists)
DROP POLICY IF EXISTS "Admins and managers can update teams" ON public.teams;

CREATE POLICY "Admins and managers can update teams" ON public.teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Add INSERT policy for teams table (if not exists)
DROP POLICY IF EXISTS "Admins and managers can create teams" ON public.teams;

CREATE POLICY "Admins and managers can create teams" ON public.teams
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Verify the changes
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
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

-- Verify RLS policies for teams table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'teams'
ORDER BY policyname;