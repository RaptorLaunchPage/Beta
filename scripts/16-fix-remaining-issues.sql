-- ====================================================================
-- FIX REMAINING PERFORMANCE CREATION AND SLOT DELETION ISSUES
-- ====================================================================
-- This script fixes the remaining issues with performance creation and slot deletion

-- ====================================================================
-- 1. FIX SLOT DELETION - ADD CASCADE DELETE FOR ATTENDANCES
-- ====================================================================

-- Drop the existing foreign key constraint that doesn't have CASCADE
ALTER TABLE public.attendances 
DROP CONSTRAINT IF EXISTS attendances_slot_id_fkey;

-- Add the foreign key constraint with CASCADE DELETE
ALTER TABLE public.attendances 
ADD CONSTRAINT attendances_slot_id_fkey 
FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;

-- ====================================================================
-- 2. FIX PERFORMANCE CREATION - ADD MISSING CONSTRAINTS
-- ====================================================================

-- Add missing foreign key constraint for performances.slot_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'performances_slot_id_fkey' 
        AND table_name = 'performances'
    ) THEN
        ALTER TABLE public.performances 
        ADD CONSTRAINT performances_slot_id_fkey 
        FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ====================================================================
-- 3. FIX PERFORMANCE VALIDATION FUNCTION
-- ====================================================================

-- Update the performance validation function to handle the new schema
CREATE OR REPLACE FUNCTION public.validate_performance_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate that player exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = NEW.player_id 
        AND status = 'Active'
    ) THEN
        RAISE EXCEPTION 'Player must be active to create performances';
    END IF;

    -- Validate that team exists if team_id is provided
    IF NEW.team_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.teams 
        WHERE id = NEW.team_id 
        AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Team must be active if specified';
    END IF;

    -- Validate that slot exists if slot_id is provided
    IF NEW.slot_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.slots 
        WHERE id = NEW.slot_id
    ) THEN
        RAISE EXCEPTION 'Slot must exist if specified';
    END IF;

    -- Validate numeric fields
    IF NEW.kills < 0 OR NEW.assists < 0 OR NEW.damage < 0 OR NEW.survival_time < 0 THEN
        RAISE EXCEPTION 'Numeric fields must be non-negative';
    END IF;

    -- Validate placement if provided
    IF NEW.placement IS NOT NULL AND NEW.placement < 1 THEN
        RAISE EXCEPTION 'Placement must be at least 1 if specified';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 4. ADD PERFORMANCE VALIDATION TRIGGER
-- ====================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_performance_trigger ON public.performances;

-- Create new validation trigger
CREATE TRIGGER validate_performance_trigger
    BEFORE INSERT OR UPDATE ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_performance_entry();

-- ====================================================================
-- 5. FIX RLS POLICIES FOR SLOTS
-- ====================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view slots" ON public.slots;
DROP POLICY IF EXISTS "Staff can manage slots" ON public.slots;

-- Create new policies for slots
CREATE POLICY "Users can view slots" ON public.slots
  FOR SELECT USING (
    -- Admins can view all slots
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Users can view slots for their team
    team_id = (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
    OR
    -- Coaches can view slots for their team
    team_id = (
      SELECT team_id FROM users WHERE id = auth.uid() AND role = 'coach'
    )
  );

CREATE POLICY "Staff can manage slots" ON public.slots
  FOR ALL USING (
    -- Admins can manage all slots
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Managers can manage all slots
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'manager'
    )
    OR
    -- Coaches can manage slots for their team
    (team_id = (
      SELECT team_id FROM users WHERE id = auth.uid() AND role = 'coach'
    ))
  );

-- ====================================================================
-- 6. ADD MISSING INDEXES FOR PERFORMANCE
-- ====================================================================

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_performances_player_id ON public.performances(player_id);
CREATE INDEX IF NOT EXISTS idx_performances_team_id ON public.performances(team_id);
CREATE INDEX IF NOT EXISTS idx_performances_slot_id ON public.performances(slot_id);
CREATE INDEX IF NOT EXISTS idx_performances_created_at ON public.performances(created_at);

-- ====================================================================
-- 7. VERIFICATION
-- ====================================================================

DO $$
BEGIN
    -- Check if all constraints exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendances_slot_id_fkey' 
        AND table_name = 'attendances'
    ) THEN
        RAISE EXCEPTION 'attendances_slot_id_fkey constraint missing';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'performances_slot_id_fkey' 
        AND table_name = 'performances'
    ) THEN
        RAISE EXCEPTION 'performances_slot_id_fkey constraint missing';
    END IF;
    
    RAISE NOTICE 'All fixes applied successfully!';
    RAISE NOTICE 'Slot deletion should now work with CASCADE DELETE';
    RAISE NOTICE 'Performance creation should now work with proper validation';
END $$;