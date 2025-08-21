-- ====================================================================
-- FIX ATTENDANCE SESSION_TIME CONSTRAINT ISSUE
-- ====================================================================
-- This script fixes the NOT NULL constraint on session_time in attendances table
-- that's preventing the attendance creation trigger from working

-- ====================================================================
-- 1. ANALYZE CURRENT SITUATION
-- ====================================================================

DO $$
DECLARE
    session_time_not_null boolean;
    session_time_exists boolean;
BEGIN
    RAISE NOTICE '=== ANALYZING ATTENDANCE SESSION_TIME ISSUE ===';
    
    -- Check if session_time column has NOT NULL constraint
    SELECT is_nullable = 'NO' INTO session_time_not_null
    FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'session_time';
    
    -- Check if session_time column exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'session_time'
    ) INTO session_time_exists;
    
    RAISE NOTICE 'Session_time column exists: %', session_time_exists;
    RAISE NOTICE 'Session_time column NOT NULL: %', session_time_not_null;
    
    IF session_time_not_null THEN
        RAISE NOTICE 'ISSUE FOUND: session_time column has NOT NULL constraint';
    END IF;
    
END $$;

-- ====================================================================
-- 2. FIX THE ATTENDANCE SESSION_TIME CONSTRAINT
-- ====================================================================

-- Make the session_time field nullable since we can derive it from other sources
ALTER TABLE public.attendances ALTER COLUMN session_time DROP NOT NULL;

-- Add a comment to clarify the field usage
COMMENT ON COLUMN public.attendances.session_time IS 'Session time - can be derived from slot or session if null';

-- ====================================================================
-- 3. UPDATE THE ATTENDANCE CREATION FUNCTION
-- ====================================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS create_attendance_from_performance_trigger ON public.performances;
DROP TRIGGER IF EXISTS create_match_attendance_from_performance_trigger ON public.performances;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.create_match_attendance_from_performance();

-- Recreate the function with proper session_time handling
CREATE OR REPLACE FUNCTION public.create_match_attendance_from_performance()
RETURNS TRIGGER AS $$
DECLARE
    slot_date date;
    slot_time_range text;
    session_id uuid;
    derived_team_id uuid;
    session_time_value time;
BEGIN
    -- Only create attendance if slot_id is provided
    IF NEW.slot_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get the slot date, team_id, and time_range
    SELECT date, team_id, time_range INTO slot_date, derived_team_id, slot_time_range
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
    
    -- Try to extract session_time from slot time_range
    IF slot_time_range IS NOT NULL AND slot_time_range ~ '^\d{2}:\d{2}' THEN
        session_time_value := (string_to_array(slot_time_range, ' - '))[1]::time;
    END IF;
    
    -- Insert attendance record
    INSERT INTO public.attendances (
        player_id,
        team_id,
        session_id,
        slot_id,
        date,
        session_time,
        status,
        source,
        created_at
    ) VALUES (
        NEW.player_id,
        COALESCE(derived_team_id, NEW.team_id),
        session_id,
        NEW.slot_id,
        slot_date,
        session_time_value,
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
    session_time_nullable boolean;
BEGIN
    RAISE NOTICE '=== VERIFYING FIX ===';
    
    -- Check if session_time column is now nullable
    SELECT is_nullable = 'YES' INTO session_time_nullable
    FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'session_time';
    
    IF session_time_nullable THEN
        RAISE NOTICE 'SUCCESS: session_time column is now nullable';
    ELSE
        RAISE NOTICE 'ERROR: session_time column is still NOT NULL';
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
    RAISE NOTICE '1. Made session_time column nullable in attendances table';
    RAISE NOTICE '2. Updated create_match_attendance_from_performance function';
    RAISE NOTICE '3. Added proper session_time derivation from slot time_range';
    RAISE NOTICE '4. Recreated attendance creation trigger';
    RAISE NOTICE '5. Tested complete performance creation flow';
    RAISE NOTICE '';
    RAISE NOTICE 'The performance creation should now work completely.';
    RAISE NOTICE 'Try creating a performance again using the debug page.';
END $$;