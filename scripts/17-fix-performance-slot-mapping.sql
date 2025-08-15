-- ====================================================================
-- FIX PERFORMANCE CREATION AND SLOT DELETION ISSUES
-- ====================================================================
-- This script fixes the issues with performance creation and slot deletion
-- by properly handling the dual slot fields (slot as integer, slot_id as uuid)

-- ====================================================================
-- 1. UNDERSTAND THE ISSUE
-- ====================================================================
-- The performances table has TWO slot fields:
-- - slot (integer) - legacy field, should be deprecated
-- - slot_id (uuid) - new field, references slots.id
-- 
-- The frontend is sending slot_id (UUID) but the API might be trying to use slot (integer)
-- This causes foreign key constraint violations

-- ====================================================================
-- 2. FIX PERFORMANCE CREATION - UPDATE API LOGIC
-- ====================================================================

-- First, let's check what data exists in the performances table
DO $$
DECLARE
    slot_count integer;
    slot_id_count integer;
    both_count integer;
BEGIN
    -- Count records with slot field
    SELECT COUNT(*) INTO slot_count FROM public.performances WHERE slot IS NOT NULL;
    
    -- Count records with slot_id field
    SELECT COUNT(*) INTO slot_id_count FROM public.performances WHERE slot_id IS NOT NULL;
    
    -- Count records with both fields
    SELECT COUNT(*) INTO both_count FROM public.performances WHERE slot IS NOT NULL AND slot_id IS NOT NULL;
    
    RAISE NOTICE 'Current performance records:';
    RAISE NOTICE '- Records with slot field: %', slot_count;
    RAISE NOTICE '- Records with slot_id field: %', slot_id_count;
    RAISE NOTICE '- Records with both fields: %', both_count;
END $$;

-- ====================================================================
-- 3. MIGRATE EXISTING DATA (if needed)
-- ====================================================================

-- If there are records with slot field but no slot_id, try to map them
-- This is a one-time migration
DO $$
DECLARE
    rec RECORD;
    slot_uuid uuid;
BEGIN
    FOR rec IN 
        SELECT id, slot 
        FROM public.performances 
        WHERE slot IS NOT NULL AND slot_id IS NULL
    LOOP
        -- Try to find a slot with matching ID (if slot was actually a UUID stored as integer)
        SELECT id INTO slot_uuid 
        FROM public.slots 
        WHERE id::text = rec.slot::text;
        
        -- If found, update the slot_id
        IF slot_uuid IS NOT NULL THEN
            UPDATE public.performances 
            SET slot_id = slot_uuid 
            WHERE id = rec.id;
            RAISE NOTICE 'Migrated performance %: slot % -> slot_id %', rec.id, rec.slot, slot_uuid;
        ELSE
            RAISE NOTICE 'Could not migrate performance %: slot % has no matching slot_id', rec.id, rec.slot;
        END IF;
    END LOOP;
END $$;

-- ====================================================================
-- 4. FIX FOREIGN KEY CONSTRAINTS
-- ====================================================================

-- Make sure the slot_id foreign key constraint exists and is correct
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
        RAISE NOTICE 'Added missing performances_slot_id_fkey constraint';
    END IF;
END $$;

-- ====================================================================
-- 5. FIX SLOT DELETION - ENSURE CASCADE DELETE
-- ====================================================================

-- Drop and recreate the attendances.slot_id constraint with CASCADE
ALTER TABLE public.attendances 
DROP CONSTRAINT IF EXISTS attendances_slot_id_fkey;

ALTER TABLE public.attendances 
ADD CONSTRAINT attendances_slot_id_fkey 
FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;

-- Also fix other tables that reference slots
ALTER TABLE public.slot_expenses 
DROP CONSTRAINT IF EXISTS slot_expenses_slot_id_fkey;

ALTER TABLE public.slot_expenses 
ADD CONSTRAINT slot_expenses_slot_id_fkey 
FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;

ALTER TABLE public.winnings 
DROP CONSTRAINT IF EXISTS winnings_slot_id_fkey;

ALTER TABLE public.winnings 
ADD CONSTRAINT winnings_slot_id_fkey 
FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;

ALTER TABLE public.prize_pools 
DROP CONSTRAINT IF EXISTS prize_pools_slot_id_fkey;

ALTER TABLE public.prize_pools 
ADD CONSTRAINT prize_pools_slot_id_fkey 
FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;

-- ====================================================================
-- 6. UPDATE PERFORMANCE VALIDATION FUNCTION
-- ====================================================================

-- Create a new validation function that handles both slot fields properly
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

    -- Validate that slot exists if slot_id is provided (preferred field)
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

    -- Ensure match_number is provided
    IF NEW.match_number IS NULL THEN
        RAISE EXCEPTION 'Match number is required';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 7. UPDATE ATTENDANCE TRIGGER
-- ====================================================================

-- Update the attendance trigger to use slot_id instead of slot
CREATE OR REPLACE FUNCTION public.create_match_attendance_from_performance()
RETURNS TRIGGER AS $$
DECLARE
    match_session_id uuid;
    performance_date date;
BEGIN
    -- Determine the date for the performance
    performance_date := CURRENT_DATE;
    IF NEW.slot_id IS NOT NULL THEN
        SELECT date INTO performance_date FROM public.slots WHERE id = NEW.slot_id;
    END IF;

    -- Create or get match session for this team and date
    INSERT INTO public.sessions (
        team_id, 
        session_type, 
        session_subtype, 
        date, 
        title,
        is_mandatory,
        created_by
    )
    SELECT 
        NEW.team_id,
        'tournament',
        'Scrims',
        performance_date,
        'Auto-generated Scrims Session',
        false,
        NEW.player_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sessions 
        WHERE team_id = NEW.team_id 
        AND date = performance_date 
        AND session_type = 'tournament'
        AND session_subtype = 'Scrims'
    )
    RETURNING id INTO match_session_id;

    -- Get session id if it already exists
    IF match_session_id IS NULL THEN
        SELECT id INTO match_session_id 
        FROM public.sessions 
        WHERE team_id = NEW.team_id 
        AND date = performance_date 
        AND session_type = 'tournament'
        AND session_subtype = 'Scrims';
    END IF;

    -- Create attendance record
    INSERT INTO public.attendances (
        player_id, 
        team_id, 
        session_id, 
        status, 
        source,
        slot_id
    )
    SELECT 
        NEW.player_id,
        NEW.team_id,
        match_session_id,
        'present',
        'auto',
        NEW.slot_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.attendances 
        WHERE player_id = NEW.player_id 
        AND session_id = match_session_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 8. ADD INDEXES FOR PERFORMANCE
-- ====================================================================

-- Add indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_performances_player_id ON public.performances(player_id);
CREATE INDEX IF NOT EXISTS idx_performances_team_id ON public.performances(team_id);
CREATE INDEX IF NOT EXISTS idx_performances_slot_id ON public.performances(slot_id);
CREATE INDEX IF NOT EXISTS idx_performances_created_at ON public.performances(created_at);
CREATE INDEX IF NOT EXISTS idx_attendances_slot_id ON public.attendances(slot_id);

-- ====================================================================
-- 9. VERIFICATION
-- ====================================================================

DO $$
DECLARE
    constraint_count integer;
BEGIN
    -- Check if all required constraints exist
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints 
    WHERE constraint_name IN (
        'performances_slot_id_fkey',
        'attendances_slot_id_fkey',
        'slot_expenses_slot_id_fkey',
        'winnings_slot_id_fkey',
        'prize_pools_slot_id_fkey'
    );
    
    IF constraint_count < 5 THEN
        RAISE EXCEPTION 'Some required constraints are missing. Found % out of 5', constraint_count;
    END IF;
    
    RAISE NOTICE 'All fixes applied successfully!';
    RAISE NOTICE 'Performance creation should now work with slot_id field';
    RAISE NOTICE 'Slot deletion should now work with CASCADE DELETE';
    RAISE NOTICE 'Found % required constraints', constraint_count;
END $$;