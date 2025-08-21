-- ====================================================================
-- DEBUG DATABASE ISSUES SCRIPT
-- ====================================================================
-- This script helps identify the exact issues causing performance and session creation failures

-- ====================================================================
-- 1. CHECK DATABASE SCHEMA AND CONSTRAINTS
-- ====================================================================

DO $$
DECLARE
    col_name text;
    col_type text;
    col_nullable text;
    constraint_name text;
    constraint_type text;
BEGIN
    RAISE NOTICE '=== DATABASE SCHEMA ANALYSIS ===';
    
    -- Check performances table structure
    RAISE NOTICE '--- PERFORMANCES TABLE ---';
    FOR col_name, col_type, col_nullable IN
        SELECT 
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'performances' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: %', col_name, col_type, col_nullable;
    END LOOP;
    
    -- Check performances table constraints
    RAISE NOTICE '--- PERFORMANCES CONSTRAINTS ---';
    FOR constraint_name, constraint_type IN
        SELECT 
            constraint_name,
            constraint_type
        FROM information_schema.table_constraints 
        WHERE table_name = 'performances'
    LOOP
        RAISE NOTICE 'Constraint: % | Type: %', constraint_name, constraint_type;
    END LOOP;
    
    -- Check slots table structure
    RAISE NOTICE '--- SLOTS TABLE ---';
    FOR col_name, col_type, col_nullable IN
        SELECT 
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'slots' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: %', col_name, col_type, col_nullable;
    END LOOP;
    
    -- Check sessions table structure
    RAISE NOTICE '--- SESSIONS TABLE ---';
    FOR col_name, col_type, col_nullable IN
        SELECT 
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: %', col_name, col_type, col_nullable;
    END LOOP;
    
    -- Check attendances table structure
    RAISE NOTICE '--- ATTENDANCES TABLE ---';
    FOR col_name, col_type, col_nullable IN
        SELECT 
            column_name,
            data_type,
            is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % | Type: % | Nullable: %', col_name, col_type, col_nullable;
    END LOOP;
    
END $$;

-- ====================================================================
-- 2. CHECK EXISTING DATA
-- ====================================================================

DO $$
DECLARE
    perf_count integer;
    slot_count integer;
    session_count integer;
    attendance_count integer;
    user_count integer;
    team_count integer;
BEGIN
    RAISE NOTICE '=== EXISTING DATA ANALYSIS ===';
    
    -- Count records in each table
    SELECT COUNT(*) INTO perf_count FROM public.performances;
    SELECT COUNT(*) INTO slot_count FROM public.slots;
    SELECT COUNT(*) INTO session_count FROM public.sessions;
    SELECT COUNT(*) INTO attendance_count FROM public.attendances;
    SELECT COUNT(*) INTO user_count FROM public.users;
    SELECT COUNT(*) INTO team_count FROM public.teams;
    
    RAISE NOTICE 'Performances: % records', perf_count;
    RAISE NOTICE 'Slots: % records', slot_count;
    RAISE NOTICE 'Sessions: % records', session_count;
    RAISE NOTICE 'Attendances: % records', attendance_count;
    RAISE NOTICE 'Users: % records', user_count;
    RAISE NOTICE 'Teams: % records', team_count;
    
    -- Check for data inconsistencies
    RAISE NOTICE '--- DATA INCONSISTENCIES ---';
    
    -- Check performances with slot_id but no matching slot
    SELECT COUNT(*) INTO perf_count 
    FROM public.performances p 
    LEFT JOIN public.slots s ON p.slot_id = s.id 
    WHERE p.slot_id IS NOT NULL AND s.id IS NULL;
    
    IF perf_count > 0 THEN
        RAISE NOTICE 'WARNING: % performances have slot_id but no matching slot', perf_count;
    END IF;
    
    -- Check performances with slot field (legacy)
    SELECT COUNT(*) INTO perf_count 
    FROM public.performances 
    WHERE slot IS NOT NULL;
    
    IF perf_count > 0 THEN
        RAISE NOTICE 'INFO: % performances have legacy slot field', perf_count;
    END IF;
    
    -- Check attendances with slot_id but no matching slot
    SELECT COUNT(*) INTO attendance_count 
    FROM public.attendances a 
    LEFT JOIN public.slots s ON a.slot_id = s.id 
    WHERE a.slot_id IS NOT NULL AND s.id IS NULL;
    
    IF attendance_count > 0 THEN
        RAISE NOTICE 'WARNING: % attendances have slot_id but no matching slot', attendance_count;
    END IF;
    
END $$;

-- ====================================================================
-- 3. CHECK RLS POLICIES
-- ====================================================================

DO $$
DECLARE
    policy_name text;
    table_name text;
    policy_definition text;
BEGIN
    RAISE NOTICE '=== RLS POLICIES ANALYSIS ===';
    
    FOR policy_name, table_name, policy_definition IN
        SELECT 
            policyname,
            tablename,
            pg_get_expr(polcmd, polrelid) as policy_definition
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN ('performances', 'slots', 'sessions', 'attendances', 'teams', 'users')
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE 'Table: % | Policy: % | Definition: %', table_name, policy_name, policy_definition;
    END LOOP;
    
END $$;

-- ====================================================================
-- 4. CHECK TRIGGERS
-- ====================================================================

DO $$
DECLARE
    trigger_name text;
    table_name text;
    trigger_function text;
BEGIN
    RAISE NOTICE '=== TRIGGERS ANALYSIS ===';
    
    FOR trigger_name, table_name, trigger_function IN
        SELECT 
            trigger_name,
            event_object_table,
            action_statement
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
        AND event_object_table IN ('performances', 'slots', 'sessions', 'attendances')
        ORDER BY event_object_table, trigger_name
    LOOP
        RAISE NOTICE 'Table: % | Trigger: % | Function: %', table_name, trigger_name, trigger_function;
    END LOOP;
    
END $$;

-- ====================================================================
-- 5. TEST PERFORMANCE CREATION SIMULATION
-- ====================================================================

DO $$
DECLARE
    test_user_id uuid;
    test_team_id uuid;
    test_slot_id uuid;
    test_performance_id uuid;
    test_session_id uuid;
    test_attendance_id uuid;
    error_message text;
BEGIN
    RAISE NOTICE '=== PERFORMANCE CREATION SIMULATION ===';
    
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
-- 6. TEST SESSION CREATION SIMULATION
-- ====================================================================

DO $$
DECLARE
    test_user_id uuid;
    test_team_id uuid;
    test_session_id uuid;
    error_message text;
BEGIN
    RAISE NOTICE '=== SESSION CREATION SIMULATION ===';
    
    -- Get a test user (coach or admin)
    SELECT id INTO test_user_id FROM public.users WHERE role IN ('coach', 'admin') LIMIT 1;
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'ERROR: No coach or admin users found for testing';
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
    
    -- Test session creation
    BEGIN
        RAISE NOTICE 'Attempting to create test session...';
        INSERT INTO public.sessions (
            team_id,
            session_type,
            session_subtype,
            date,
            start_time,
            end_time,
            title,
            description,
            is_mandatory,
            created_by
        ) VALUES (
            test_team_id,
            'practice',
            'Evening',
            CURRENT_DATE,
            '18:00',
            '20:00',
            'Debug Test Session',
            'Test session for debugging',
            true,
            test_user_id
        ) RETURNING id INTO test_session_id;
        
        RAISE NOTICE 'SUCCESS: Session created with ID: %', test_session_id;
        
        -- Clean up test data
        DELETE FROM public.sessions WHERE id = test_session_id;
        
    EXCEPTION WHEN OTHERS THEN
        error_message := SQLERRM;
        RAISE NOTICE 'ERROR: Session creation failed: %', error_message;
        
        -- Clean up any partial data
        IF test_session_id IS NOT NULL THEN
            DELETE FROM public.sessions WHERE id = test_session_id;
        END IF;
    END;
    
END $$;

-- ====================================================================
-- 7. CHECK FOREIGN KEY CONSTRAINTS
-- ====================================================================

DO $$
DECLARE
    constraint_name text;
    table_name text;
    column_name text;
    foreign_table_name text;
    foreign_column_name text;
    delete_rule text;
    update_rule text;
BEGIN
    RAISE NOTICE '=== FOREIGN KEY CONSTRAINTS ANALYSIS ===';
    
    FOR constraint_name, table_name, column_name, foreign_table_name, foreign_column_name, delete_rule, update_rule IN
        SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            rc.delete_rule,
            rc.update_rule
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        JOIN information_schema.referential_constraints AS rc
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('performances', 'slots', 'sessions', 'attendances')
        ORDER BY tc.table_name, tc.constraint_name
    LOOP
        RAISE NOTICE 'Table: % | Column: % | References: %.% | Delete: % | Update: %', 
            table_name, column_name, foreign_table_name, foreign_column_name, delete_rule, update_rule;
    END LOOP;
    
END $$;

-- ====================================================================
-- 8. SUMMARY AND RECOMMENDATIONS
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '=== SUMMARY AND RECOMMENDATIONS ===';
    RAISE NOTICE '';
    RAISE NOTICE '1. Check the debug logs above for any ERROR or WARNING messages';
    RAISE NOTICE '2. If performance creation simulation failed, check the error message';
    RAISE NOTICE '3. If session creation simulation failed, check the error message';
    RAISE NOTICE '4. Verify that all required foreign key constraints exist';
    RAISE NOTICE '5. Check that RLS policies allow the current user to perform the operations';
    RAISE NOTICE '6. Ensure that triggers are working correctly';
    RAISE NOTICE '';
    RAISE NOTICE 'Common issues to check:';
    RAISE NOTICE '- Missing foreign key constraints';
    RAISE NOTICE '- RLS policies blocking operations';
    RAISE NOTICE '- Trigger functions failing';
    RAISE NOTICE '- Data type mismatches';
    RAISE NOTICE '- Required fields not being provided';
    RAISE NOTICE '';
    RAISE NOTICE 'Use the debug page at /debug to test the APIs directly';
END $$;