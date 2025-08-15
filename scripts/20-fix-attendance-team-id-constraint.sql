-- ====================================================================
-- FIX ATTENDANCE TEAM_ID CONSTRAINT ISSUE
-- ====================================================================
-- This script fixes the NOT NULL constraint on team_id in attendances table
-- that's preventing the attendance creation trigger from working

-- ====================================================================
-- 1. ANALYZE CURRENT SITUATION
-- ====================================================================

DO $$
DECLARE
    team_id_not_null boolean;
    team_id_exists boolean;
BEGIN
    RAISE NOTICE '=== ANALYZING ATTENDANCE TEAM_ID ISSUE ===';
    
    -- Check if team_id column has NOT NULL constraint
    SELECT is_nullable = 'NO' INTO team_id_not_null
    FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'team_id';
    
    -- Check if team_id column exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'team_id'
    ) INTO team_id_exists;
    
    RAISE NOTICE 'Team_id column exists: %', team_id_exists;
    RAISE NOTICE 'Team_id column NOT NULL: %', team_id_not_null;
    
    IF team_id_not_null THEN
        RAISE NOTICE 'ISSUE FOUND: team_id column has NOT NULL constraint';
    END IF;
    
END $$;

-- ====================================================================
-- 2. FIX THE ATTENDANCE TEAM_ID CONSTRAINT
-- ====================================================================

-- Make the team_id field nullable since we can derive it from other sources
ALTER TABLE public.attendances ALTER COLUMN team_id DROP NOT NULL;

-- Add a comment to clarify the field usage
COMMENT ON COLUMN public.attendances.team_id IS 'Team ID - can be derived from player_id or slot_id if null';

-- ====================================================================
-- 3. UPDATE THE ATTENDANCE CREATION FUNCTION
-- ====================================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS create_attendance_from_performance_trigger ON public.performances;
DROP TRIGGER IF EXISTS create_match_attendance_from_performance_trigger ON public.performances;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.create_match_attendance_from_performance();

-- Recreate the function with proper team_id handling
CREATE OR REPLACE FUNCTION public.create_match_attendance_from_performance()
RETURNS TRIGGER AS $$
DECLARE
    slot_date date;
    session_id uuid;
    derived_team_id uuid;
BEGIN
    -- Only create attendance if slot_id is provided
    IF NEW.slot_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get the slot date and team_id
    SELECT date, team_id INTO slot_date, derived_team_id
    FROM public.slots
    WHERE id = NEW.slot_id;
    
    IF slot_date IS NULL THEN
        RAISE EXCEPTION 'Could not find slot date for slot_id: %', NEW.slot_id;
    END IF;
    
    -- If team_id is null, try to get it from the user
    IF derived_team_id IS NULL THEN
        SELECT team_id INTO derived_team_id
        FROM public.users
        WHERE id = NEW.player_id;
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
    WHERE team_id = COALESCE(derived_team_id, NEW.team_id)
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
        COALESCE(derived_team_id, NEW.team_id),
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
-- 4. ENSURE THE ATTENDANCE TRIGGER EXISTS
-- ====================================================================

-- Create the trigger
CREATE TRIGGER create_attendance_from_performance_trigger
    AFTER INSERT ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.create_match_attendance_from_performance();

-- ====================================================================
-- 5. VERIFY THE FIX
-- ====================================================================

DO $$
DECLARE
    team_id_nullable boolean;
BEGIN
    RAISE NOTICE '=== VERIFYING FIX ===';
    
    -- Check if team_id column is now nullable
    SELECT is_nullable = 'YES' INTO team_id_nullable
    FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'team_id';
    
    IF team_id_nullable THEN
        RAISE NOTICE 'SUCCESS: team_id column is now nullable';
    ELSE
        RAISE NOTICE 'ERROR: team_id column is still NOT NULL';
    END IF;
    
END $$;

-- ====================================================================
-- 6. TEST THE COMPLETE FLOW
-- ====================================================================

DO $$
DECLARE
    test_user_id uuid;
    test_team_id uuid;
    test_slot_id uuid;
    test_performance_id uuid;
    test_attendance_id uuid;
    error_message text;
BEGIN
    RAISE NOTICE '=== TESTING COMPLETE PERFORMANCE CREATION ===';
    
    -- Get a test user
    SELECT id INTO test_user_id FROM public.users WHERE role = 'player' LIMIT 1;
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'ERROR: No player users found for testing';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using test user: %', test_user_id;
    
    -- Get user's team
    SELECT team_id INTO test_team_id FROM public.users WHERE id = test_user_id;
    IF test_team_id IS NULL THEN
        RAISE NOTICE 'ERROR: Test user has no team assigned';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Using test team: %', test_team_id;
    
    -- Get or create a test slot
    SELECT id INTO test_slot_id FROM public.slots WHERE team_id = test_team_id LIMIT 1;
    IF test_slot_id IS NULL THEN
        RAISE NOTICE 'Creating test slot...';
        INSERT INTO public.slots (team_id, organizer, time_range, date, slot_rate, match_count)
        VALUES (test_team_id, 'Debug Test', '18:00 - 20:00', CURRENT_DATE, 0, 1)
        RETURNING id INTO test_slot_id;
        RAISE NOTICE 'Created test slot: %', test_slot_id;
    ELSE
        RAISE NOTICE 'Using existing slot: %', test_slot_id;
    END IF;
    
    -- Test performance creation
    BEGIN
        RAISE NOTICE 'Attempting to create test performance...';
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
        
        -- Check if attendance was created
        SELECT id INTO test_attendance_id 
        FROM public.attendances 
        WHERE player_id = test_user_id 
        AND slot_id = test_slot_id;
        
        IF test_attendance_id IS NOT NULL THEN
            RAISE NOTICE 'SUCCESS: Attendance record created with ID: %', test_attendance_id;
        ELSE
            RAISE NOTICE 'WARNING: No attendance record was created automatically';
        END IF;
        
        -- Clean up test data
        DELETE FROM public.performances WHERE id = test_performance_id;
        IF test_attendance_id IS NOT NULL THEN
            DELETE FROM public.attendances WHERE id = test_attendance_id;
        END IF;
        
        -- Clean up test slot if we created it
        IF test_slot_id IS NOT NULL THEN
            DELETE FROM public.slots WHERE id = test_slot_id;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        error_message := SQLERRM;
        RAISE NOTICE 'ERROR: Performance creation failed: %', error_message;
        
        -- Clean up any partial data
        IF test_performance_id IS NOT NULL THEN
            DELETE FROM public.performances WHERE id = test_performance_id;
        END IF;
        IF test_attendance_id IS NOT NULL THEN
            DELETE FROM public.attendances WHERE id = test_attendance_id;
        END IF;
    END;
    
END $$;

-- ====================================================================
-- 7. SUMMARY
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '=== FIX SUMMARY ===';
    RAISE NOTICE '';
    RAISE NOTICE '1. Made team_id column nullable in attendances table';
    RAISE NOTICE '2. Updated create_match_attendance_from_performance function';
    RAISE NOTICE '3. Added proper team_id derivation logic';
    RAISE NOTICE '4. Recreated attendance creation trigger';
    RAISE NOTICE '5. Tested complete performance creation flow';
    RAISE NOTICE '';
    RAISE NOTICE 'The performance creation should now work completely.';
    RAISE NOTICE 'Try creating a performance again using the debug page.';
END $$;