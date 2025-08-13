-- Fix: Allow multiple performance submissions per slot
-- This removes the duplicate prevention that was blocking multiple performances per slot per player

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
DROP FUNCTION IF EXISTS public.create_auto_attendance_fixed();

-- Create new function that allows multiple attendance records per slot per player
-- Each performance should create its own attendance record
CREATE OR REPLACE FUNCTION public.create_auto_attendance_fixed()
RETURNS TRIGGER AS $$
DECLARE
    slot_date date;
    slot_team_id uuid;
    attendance_date date;
    attendance_team_id uuid;
BEGIN
    -- Log the trigger call (if debug table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_debug_log') THEN
        INSERT INTO public.attendance_debug_log (message, data)
        VALUES ('Trigger called for performance (v2)', jsonb_build_object(
            'performance_id', NEW.id,
            'player_id', NEW.player_id,
            'team_id', NEW.team_id,
            'slot', NEW.slot
        ));
    END IF;
    
    -- Initialize fallback values
    attendance_date := CURRENT_DATE;
    attendance_team_id := NEW.team_id;
    
    -- Try to get slot information if slot is linked to performance
    IF NEW.slot IS NOT NULL THEN
        SELECT date, team_id INTO slot_date, slot_team_id
        FROM public.slots
        WHERE id = NEW.slot;
        
        -- Log slot lookup (if debug table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_debug_log') THEN
            INSERT INTO public.attendance_debug_log (message, data)
            VALUES ('Slot lookup result (v2)', jsonb_build_object(
                'slot_id', NEW.slot,
                'slot_date', slot_date,
                'slot_team_id', slot_team_id
            ));
        END IF;
        
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
    
    -- Log final values (if debug table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_debug_log') THEN
        INSERT INTO public.attendance_debug_log (message, data)
        VALUES ('Final values determined (v2)', jsonb_build_object(
            'attendance_date', attendance_date,
            'attendance_team_id', attendance_team_id
        ));
    END IF;
    
    -- CHANGED: Always create attendance record for each performance
    -- No duplicate checking - each performance gets its own attendance record
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
        
        -- Log successful insertion (if debug table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_debug_log') THEN
            INSERT INTO public.attendance_debug_log (message, data)
            VALUES ('Successfully inserted attendance (v2)', jsonb_build_object(
                'player_id', NEW.player_id,
                'team_id', attendance_team_id,
                'date', attendance_date,
                'slot_id', NEW.slot,
                'performance_id', NEW.id
            ));
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- Log any insertion errors (if debug table exists)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance_debug_log') THEN
            INSERT INTO public.attendance_debug_log (message, data)
            VALUES ('Error inserting attendance (v2)', jsonb_build_object(
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

-- Create trigger to auto-create attendance on performance entry
CREATE TRIGGER auto_attendance_on_performance
  AFTER INSERT ON public.performances
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auto_attendance_fixed();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_auto_attendance_fixed() TO authenticated;

-- Test query to verify multiple attendance records are being created
-- Run this after testing multiple performance submissions:
/*
SELECT 
    a.id,
    a.player_id,
    a.slot_id,
    a.date,
    a.created_at,
    u.name as player_name,
    COUNT(p.id) as performance_count
FROM attendances a
LEFT JOIN users u ON a.player_id = u.id
LEFT JOIN performances p ON p.slot = a.slot_id AND p.player_id = a.player_id
WHERE a.source = 'auto' 
AND a.session_time = 'Match'
GROUP BY a.id, a.player_id, a.slot_id, a.date, a.created_at, u.name
ORDER BY a.created_at DESC;
*/