-- ====================================================================
-- FIX SLOT FIELD CONSTRAINT ISSUE
-- ====================================================================
-- This script fixes the NOT NULL constraint on the legacy 'slot' field
-- that's preventing performance creation

-- ====================================================================
-- 1. ANALYZE CURRENT SITUATION
-- ====================================================================

DO $$
DECLARE
    slot_not_null boolean;
    slot_id_exists boolean;
    slot_exists boolean;
BEGIN
    RAISE NOTICE '=== ANALYZING SLOT FIELD ISSUE ===';
    
    -- Check if slot column has NOT NULL constraint
    SELECT is_nullable = 'NO' INTO slot_not_null
    FROM information_schema.columns 
    WHERE table_name = 'performances' AND column_name = 'slot';
    
    -- Check if slot_id column exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'performances' AND column_name = 'slot_id'
    ) INTO slot_id_exists;
    
    -- Check if slot column exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'performances' AND column_name = 'slot'
    ) INTO slot_exists;
    
    RAISE NOTICE 'Slot column exists: %', slot_exists;
    RAISE NOTICE 'Slot column NOT NULL: %', slot_not_null;
    RAISE NOTICE 'Slot_id column exists: %', slot_id_exists;
    
    IF slot_not_null THEN
        RAISE NOTICE 'ISSUE FOUND: slot column has NOT NULL constraint but should be nullable';
    END IF;
    
END $$;

-- ====================================================================
-- 2. FIX THE SLOT FIELD CONSTRAINT
-- ====================================================================

-- Make the legacy slot field nullable since we're using slot_id now
ALTER TABLE public.performances ALTER COLUMN slot DROP NOT NULL;

-- Add a comment to clarify the field usage
COMMENT ON COLUMN public.performances.slot IS 'Legacy slot field (integer) - use slot_id (UUID) instead';

-- ====================================================================
-- 3. VERIFY THE FIX
-- ====================================================================

DO $$
DECLARE
    slot_nullable boolean;
BEGIN
    RAISE NOTICE '=== VERIFYING FIX ===';
    
    -- Check if slot column is now nullable
    SELECT is_nullable = 'YES' INTO slot_nullable
    FROM information_schema.columns 
    WHERE table_name = 'performances' AND column_name = 'slot';
    
    IF slot_nullable THEN
        RAISE NOTICE 'SUCCESS: slot column is now nullable';
    ELSE
        RAISE NOTICE 'ERROR: slot column is still NOT NULL';
    END IF;
    
END $$;

-- ====================================================================
-- 4. UPDATE THE PERFORMANCE VALIDATION FUNCTION
-- ====================================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS validate_performance_entry_trigger ON public.performances;
DROP TRIGGER IF EXISTS validate_performance_trigger ON public.performances;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.validate_performance_entry();

-- Recreate the function with proper slot handling
CREATE OR REPLACE FUNCTION public.validate_performance_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate match_number
    IF NEW.match_number IS NULL OR NEW.match_number < 0 THEN
        RAISE EXCEPTION 'match_number must be a non-negative integer';
    END IF;
    
    -- Validate slot_id if provided
    IF NEW.slot_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.slots WHERE id = NEW.slot_id) THEN
            RAISE EXCEPTION 'slot_id must reference an existing slot';
        END IF;
    END IF;
    
    -- Validate numeric fields
    IF NEW.kills IS NULL OR NEW.kills < 0 THEN
        RAISE EXCEPTION 'kills must be a non-negative integer';
    END IF;
    
    IF NEW.assists IS NULL OR NEW.assists < 0 THEN
        RAISE EXCEPTION 'assists must be a non-negative integer';
    END IF;
    
    IF NEW.damage IS NULL OR NEW.damage < 0 THEN
        RAISE EXCEPTION 'damage must be a non-negative integer';
    END IF;
    
    IF NEW.survival_time IS NULL OR NEW.survival_time < 0 THEN
        RAISE EXCEPTION 'survival_time must be a non-negative integer';
    END IF;
    
    -- Validate placement
    IF NEW.placement IS NULL OR NEW.placement < 1 THEN
        RAISE EXCEPTION 'placement must be a positive integer';
    END IF;
    
    -- Set legacy slot field to null to avoid confusion
    NEW.slot := NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 5. ENSURE THE TRIGGER EXISTS
-- ====================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_performance_trigger ON public.performances;

-- Create the trigger
CREATE TRIGGER validate_performance_trigger
    BEFORE INSERT OR UPDATE ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_performance_entry();

-- ====================================================================
-- 6. UPDATE THE ATTENDANCE CREATION FUNCTION
-- ====================================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS create_attendance_from_performance_trigger ON public.performances;
DROP TRIGGER IF EXISTS create_match_attendance_from_performance_trigger ON public.performances;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.create_match_attendance_from_performance();

-- Recreate the function with proper slot_id handling
CREATE OR REPLACE FUNCTION public.create_match_attendance_from_performance()
RETURNS TRIGGER AS $$
DECLARE
    slot_date date;
    session_id uuid;
BEGIN
    -- Only create attendance if slot_id is provided
    IF NEW.slot_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get the slot date
    SELECT date INTO slot_date
    FROM public.slots
    WHERE id = NEW.slot_id;
    
    IF slot_date IS NULL THEN
        RAISE EXCEPTION 'Could not find slot date for slot_id: %', NEW.slot_id;
    END IF;
    
    -- Check if attendance already exists
    IF EXISTS (
        SELECT 1 FROM public.attendances 
        WHERE player_id = NEW.player_id 
        AND slot_id = NEW.slot_id
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Find or create a session for this slot
    SELECT id INTO session_id
    FROM public.sessions
    WHERE team_id = NEW.team_id
    AND date = slot_date
    LIMIT 1;
    
    -- Insert attendance record
    INSERT INTO public.attendances (
        player_id,
        team_id,
        session_id,
        slot_id,
        date,
        status,
        source,
        created_at
    ) VALUES (
        NEW.player_id,
        NEW.team_id,
        session_id,
        NEW.slot_id,
        slot_date,
        'present',
        'performance_creation',
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 7. ENSURE THE ATTENDANCE TRIGGER EXISTS
-- ====================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_attendance_from_performance_trigger ON public.performances;

-- Create the trigger
CREATE TRIGGER create_attendance_from_performance_trigger
    AFTER INSERT ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.create_match_attendance_from_performance();

-- ====================================================================
-- 8. VERIFY THE FIX WORKS
-- ====================================================================

DO $$
DECLARE
    test_user_id uuid;
    test_team_id uuid;
    test_slot_id uuid;
    test_performance_id uuid;
    error_message text;
BEGIN
    RAISE NOTICE '=== TESTING PERFORMANCE CREATION ===';
    
    -- Get a test user
    SELECT id INTO test_user_id FROM public.users WHERE role = 'player' LIMIT 1;
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'ERROR: No player users found for testing';
        RETURN;
    END IF;
    
    -- Get user's team
    SELECT team_id INTO test_team_id FROM public.users WHERE id = test_user_id;
    IF test_team_id IS NULL THEN
        RAISE NOTICE 'ERROR: Test user has no team assigned';
        RETURN;
    END IF;
    
    -- Get or create a test slot
    SELECT id INTO test_slot_id FROM public.slots WHERE team_id = test_team_id LIMIT 1;
    IF test_slot_id IS NULL THEN
        RAISE NOTICE 'Creating test slot...';
        INSERT INTO public.slots (team_id, organizer, time_range, date, slot_rate, match_count)
        VALUES (test_team_id, 'Debug Test', '18:00 - 20:00', CURRENT_DATE, 0, 1)
        RETURNING id INTO test_slot_id;
    END IF;
    
    -- Test performance creation
    BEGIN
        INSERT INTO public.performances (
            player_id, 
            team_id, 
            match_number, 
            map, 
            placement, 
            kills, 
            assists, 
            damage, 
            survival_time, 
            slot_id, 
            added_by
        ) VALUES (
            test_user_id,
            test_team_id,
            1,
            'Erangle',
            1,
            5,
            2,
            1500,
            20,
            test_slot_id,
            test_user_id
        ) RETURNING id INTO test_performance_id;
        
        RAISE NOTICE 'SUCCESS: Performance created with ID: %', test_performance_id;
        
        -- Clean up test data
        DELETE FROM public.performances WHERE id = test_performance_id;
        DELETE FROM public.attendances WHERE slot_id = test_slot_id;
        DELETE FROM public.slots WHERE id = test_slot_id;
        
    EXCEPTION WHEN OTHERS THEN
        error_message := SQLERRM;
        RAISE NOTICE 'ERROR: Performance creation still failed: %', error_message;
    END;
    
END $$;

-- ====================================================================
-- 9. SUMMARY
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '=== FIX SUMMARY ===';
    RAISE NOTICE '';
    RAISE NOTICE '1. Made slot column nullable to allow null values';
    RAISE NOTICE '2. Updated validate_performance_entry function to handle slot_id properly';
    RAISE NOTICE '3. Updated create_match_attendance_from_performance function';
    RAISE NOTICE '4. Recreated triggers for validation and attendance creation';
    RAISE NOTICE '5. Tested performance creation';
    RAISE NOTICE '';
    RAISE NOTICE 'The performance creation should now work properly.';
    RAISE NOTICE 'Try creating a performance again using the debug page.';
END $$;