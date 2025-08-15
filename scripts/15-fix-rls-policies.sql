-- ====================================================================
-- FIX RLS POLICIES FOR PERFORMANCE CREATION
-- ====================================================================
-- This script fixes RLS policies to allow players to create their own performances

-- Drop existing insert policy for performances
DROP POLICY IF EXISTS "Staff can insert performances" ON public.performances;

-- Create new insert policy that allows players to create their own performances
CREATE POLICY "Users can insert performances" ON public.performances
  FOR INSERT WITH CHECK (
    -- Admins, managers, and coaches can insert for any team
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager', 'coach')
      AND (u.role IN ('admin', 'manager') OR u.team_id = team_id)
    )
    OR
    -- Players can only insert their own performances
    (player_id = auth.uid() AND team_id = (
      SELECT team_id FROM users WHERE id = auth.uid()
    ))
  );

-- Drop existing update policy for performances
DROP POLICY IF EXISTS "Staff can update performances" ON public.performances;

-- Create new update policy that allows players to update their own performances
CREATE POLICY "Users can update performances" ON public.performances
  FOR UPDATE USING (
    -- Admins, managers, and coaches can update team performances
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager', 'coach')
      AND (u.role IN ('admin', 'manager') OR u.team_id = performances.team_id)
    )
    OR
    -- Players can only update their own performances
    player_id = auth.uid()
  );

-- Drop existing delete policy for performances
DROP POLICY IF EXISTS "Staff can delete performances" ON public.performances;

-- Create new delete policy that allows players to delete their own performances
CREATE POLICY "Users can delete performances" ON public.performances
  FOR DELETE USING (
    -- Admins, managers, and coaches can delete team performances
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager', 'coach')
      AND (u.role IN ('admin', 'manager') OR u.team_id = performances.team_id)
    )
    OR
    -- Players can only delete their own performances
    player_id = auth.uid()
  );

-- Also fix teams table to allow players to view their own team
DROP POLICY IF EXISTS "All authenticated users can view teams" ON public.teams;

CREATE POLICY "Users can view teams" ON public.teams
  FOR SELECT USING (
    -- Admins can view all teams
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Users can view their own team
    id = (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
    OR
    -- Coaches can view their team
    coach_id = auth.uid()
  );

-- Verify policies are created
DO $$
BEGIN
    RAISE NOTICE 'RLS policies updated successfully!';
    RAISE NOTICE 'Players can now create, update, and delete their own performances.';
END $$;