-- Debug version of attendance trigger with logging
-- This version includes comprehensive logging to help identify the issue

-- First, create a simple logging table
CREATE TABLE IF NOT EXISTS public.attendance_debug_log (
    id uuid DEFAULT gen_random_uuid(),
    timestamp timestamp DEFAULT now(),
    message text,
    data jsonb
);

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
DROP FUNCTION IF EXISTS public.create_auto_attendance_fixed();

-- Create debug version of the function
CREATE OR REPLACE FUNCTION public.create_auto_attendance_fixed()
RETURNS TRIGGER AS $$
DECLARE
    slot_date date;
    slot_team_id uuid;
    attendance_date date;
    attendance_team_id uuid;
    debug_data jsonb;
    existing_count integer;
BEGIN
    -- Log the trigger call
    INSERT INTO public.attendance_debug_log (message, data)
    VALUES ('Trigger called for performance', jsonb_build_object(
        'performance_id', NEW.id,
        'player_id', NEW.player_id,
        'team_id', NEW.team_id,
        'slot', NEW.slot
    ));
    
    -- Initialize fallback values
    attendance_date := CURRENT_DATE;
    attendance_team_id := NEW.team_id;
    
    -- Try to get slot information if slot is linked to performance
    IF NEW.slot IS NOT NULL THEN
        SELECT date, team_id INTO slot_date, slot_team_id
        FROM public.slots
        WHERE id = NEW.slot;
        
        -- Log slot lookup
        INSERT INTO public.attendance_debug_log (message, data)
        VALUES ('Slot lookup result', jsonb_build_object(
            'slot_id', NEW.slot,
            'slot_date', slot_date,
            'slot_team_id', slot_team_id
        ));
        
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
    
    -- Log final values
    INSERT INTO public.attendance_debug_log (message, data)
    VALUES ('Final values determined', jsonb_build_object(
        'attendance_date', attendance_date,
        'attendance_team_id', attendance_team_id
    ));
    
    -- For slot-based performances (most common case)
    IF NEW.slot IS NOT NULL THEN
        -- Check for existing attendance
        SELECT COUNT(*) INTO existing_count
        FROM public.attendances 
        WHERE player_id = NEW.player_id 
        AND slot_id = NEW.slot
        AND session_time = 'Match';
        
        -- Log duplicate check
        INSERT INTO public.attendance_debug_log (message, data)
        VALUES ('Slot-based duplicate check', jsonb_build_object(
            'existing_count', existing_count,
            'will_insert', (existing_count = 0)
        ));
        
        IF existing_count = 0 THEN
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
                
                -- Log successful insertion
                INSERT INTO public.attendance_debug_log (message, data)
                VALUES ('Successfully inserted slot-based attendance', jsonb_build_object(
                    'player_id', NEW.player_id,
                    'team_id', attendance_team_id,
                    'date', attendance_date,
                    'slot_id', NEW.slot
                ));
                
            EXCEPTION WHEN OTHERS THEN
                -- Log any insertion errors
                INSERT INTO public.attendance_debug_log (message, data)
                VALUES ('Error inserting slot-based attendance', jsonb_build_object(
                    'error_code', SQLSTATE,
                    'error_message', SQLERRM
                ));
            END;
        END IF;
    ELSE
        -- For performances without slots, create attendance but avoid duplicates on same day
        SELECT COUNT(*) INTO existing_count
        FROM public.attendances 
        WHERE player_id = NEW.player_id 
        AND date = attendance_date 
        AND session_time = 'Match'
        AND team_id = attendance_team_id
        AND slot_id IS NULL;
        
        -- Log duplicate check
        INSERT INTO public.attendance_debug_log (message, data)
        VALUES ('Date-based duplicate check', jsonb_build_object(
            'existing_count', existing_count,
            'will_insert', (existing_count = 0)
        ));
        
        IF existing_count = 0 THEN
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
                    NULL
                );
                
                -- Log successful insertion
                INSERT INTO public.attendance_debug_log (message, data)
                VALUES ('Successfully inserted date-based attendance', jsonb_build_object(
                    'player_id', NEW.player_id,
                    'team_id', attendance_team_id,
                    'date', attendance_date
                ));
                
            EXCEPTION WHEN OTHERS THEN
                -- Log any insertion errors
                INSERT INTO public.attendance_debug_log (message, data)
                VALUES ('Error inserting date-based attendance', jsonb_build_object(
                    'error_code', SQLSTATE,
                    'error_message', SQLERRM
                ));
            END;
        END IF;
    END IF;
    
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
GRANT INSERT, SELECT ON public.attendance_debug_log TO authenticated;

-- Query to check debug logs after testing
-- SELECT * FROM public.attendance_debug_log ORDER BY timestamp DESC LIMIT 20;