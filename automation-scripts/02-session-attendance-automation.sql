-- ====================================================================
-- 📅 SESSION & ATTENDANCE AUTOMATION - SCRIPT #2
-- ====================================================================
-- This script creates automation functions for sessions and attendance
-- Run this after core automation functions

-- ====================================================================
-- 1. HOLIDAY CHECK FUNCTION
-- ====================================================================

-- Function to check if a date is a holiday
CREATE OR REPLACE FUNCTION public.is_holiday(check_date date, team_id_param uuid DEFAULT NULL)
RETURNS boolean AS $$
DECLARE
    day_of_week integer;
BEGIN
    day_of_week := EXTRACT(DOW FROM check_date);
    
    RETURN EXISTS (
        SELECT 1 FROM public.holidays 
        WHERE is_active = true
        AND (
            -- Specific date holiday
            (date = check_date AND (team_id IS NULL OR team_id = team_id_param))
            OR 
            -- Recurring weekly holiday
            (recurring_day = day_of_week AND (team_id IS NULL OR team_id = team_id_param))
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 2. DAILY PRACTICE SESSION GENERATION
-- ====================================================================

-- Function to generate daily practice sessions based on practice_session_config
CREATE OR REPLACE FUNCTION public.generate_daily_practice_sessions(target_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
    config_record record;
BEGIN
    -- Generate sessions for teams that have active configurations
    INSERT INTO public.sessions (
        team_id,
        session_type,
        session_subtype,
        date,
        start_time,
        end_time,
        cutoff_time,
        title,
        description,
        is_mandatory,
        created_by
    )
    SELECT 
        psc.team_id,
        'practice'::text,
        psc.session_subtype,
        target_date,
        psc.start_time,
        psc.end_time,
        psc.cutoff_time,
        CONCAT(psc.session_subtype, ' Practice - ', target_date),
        'Auto-generated daily practice session',
        true,
        psc.created_by
    FROM public.practice_session_config psc
    WHERE psc.is_active = true
    AND NOT public.is_holiday(target_date, psc.team_id)
    AND NOT EXISTS (
        -- Don't create if session already exists for this team/date/subtype
        SELECT 1 FROM public.sessions s
        WHERE s.team_id = psc.team_id
        AND s.date = target_date
        AND s.session_subtype = psc.session_subtype
        AND s.session_type = 'practice'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 3. AUTO-MARK ABSENCE AFTER CUTOFF
-- ====================================================================

-- Function to auto-mark absence after cutoff time
CREATE OR REPLACE FUNCTION public.auto_mark_absent_after_cutoff()
RETURNS void AS $$
DECLARE
    session_record record;
    player_record record;
BEGIN
    -- Find sessions where cutoff time has passed today
    FOR session_record IN 
        SELECT s.id, s.team_id, s.cutoff_time, s.date, s.session_subtype
        FROM public.sessions s
        WHERE s.date = CURRENT_DATE 
        AND s.session_type = 'practice'
        AND s.cutoff_time < CURRENT_TIME
        AND s.is_mandatory = true
    LOOP
        -- Find players who haven't marked attendance for this session
        FOR player_record IN
            SELECT u.id
            FROM public.users u
            WHERE u.team_id = session_record.team_id
            AND u.role = 'player'
            AND u.status = 'Active'
            AND NOT EXISTS (
                SELECT 1 FROM public.attendances a
                WHERE a.player_id = u.id 
                AND a.session_id = session_record.id
            )
        LOOP
            -- Auto-mark as absent
            INSERT INTO public.attendances (
                player_id, 
                team_id, 
                session_id,
                date,
                session_time,
                status, 
                source,
                created_at
            ) VALUES (
                player_record.id,
                session_record.team_id,
                session_record.id,
                session_record.date,
                session_record.session_subtype,
                'absent',
                'system',
                now()
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 4. PERFORMANCE-BASED ATTENDANCE CREATION
-- ====================================================================

-- Function to create attendance from performance entries
CREATE OR REPLACE FUNCTION public.create_auto_attendance_fixed()
RETURNS TRIGGER AS $$
DECLARE
    slot_date date;
    slot_team_id uuid;
    attendance_date date;
    attendance_team_id uuid;
BEGIN
    -- Initialize fallback values
    attendance_date := CURRENT_DATE;
    attendance_team_id := NEW.team_id;
    
    -- Try to get slot information if slot is linked to performance
    IF NEW.slot IS NOT NULL THEN
        SELECT date, team_id INTO slot_date, slot_team_id
        FROM public.slots
        WHERE id = NEW.slot;
        
        -- Use slot information if available, but ensure non-null values
        IF slot_date IS NOT NULL THEN
            attendance_date := slot_date;
        END IF;
        
        IF slot_team_id IS NOT NULL THEN
            attendance_team_id := slot_team_id;
        END IF;
    END IF;
    
    -- Always ensure we have a non-null date and team_id
    IF attendance_date IS NULL THEN
        attendance_date := CURRENT_DATE;
    END IF;
    
    IF attendance_team_id IS NULL THEN
        attendance_team_id := NEW.team_id;
    END IF;
    
    -- Create attendance record for each performance
    BEGIN
        INSERT INTO public.attendances (
            player_id, 
            team_id, 
            date, 
            session_time, 
            status, 
            source, 
            marked_by, 
            slot_id
        )
        VALUES (
            NEW.player_id,
            attendance_team_id,
            attendance_date,
            'Match',
            'auto',
            'auto',
            NULL,
            NEW.slot
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Log any insertion errors (if debug table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_debug_log') THEN
            INSERT INTO public.attendance_debug_log (message, data)
            VALUES ('Error inserting attendance', jsonb_build_object(
                'error_code', SQLSTATE,
                'error_message', SQLERRM,
                'performance_id', NEW.id
            ));
        END IF;
        
        -- Re-raise the error so it's not silently ignored
        RAISE;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 5. GRANT PERMISSIONS
-- ====================================================================

-- Grant execute permissions on session/attendance functions
GRANT EXECUTE ON FUNCTION public.is_holiday(date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_daily_practice_sessions(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_mark_absent_after_cutoff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_auto_attendance_fixed() TO authenticated;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Session & Attendance automation functions created successfully!';
    RAISE NOTICE '📅 Created % session/attendance functions', 4;
    RAISE NOTICE '🔧 Ready for next automation script!';
END $$;