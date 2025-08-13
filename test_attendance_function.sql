-- Test script to manually verify attendance function logic
-- This helps debug the attendance creation issue

-- First, let's create a test function to manually call our attendance logic
CREATE OR REPLACE FUNCTION public.test_attendance_creation(
    test_player_id uuid,
    test_team_id uuid,
    test_slot_id uuid
)
RETURNS json AS $$
DECLARE
    slot_date date;
    slot_team_id uuid;
    attendance_date date;
    attendance_team_id uuid;
    result json;
    error_msg text;
BEGIN
    -- Initialize result object
    result := '{"status": "starting", "steps": []}'::json;
    
    BEGIN
        -- Step 1: Initialize fallback values
        attendance_date := CURRENT_DATE;
        attendance_team_id := test_team_id;
        result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || '["Step 1: Initialized fallback values"]'::jsonb);
        
        -- Step 2: Try to get slot information
        IF test_slot_id IS NOT NULL THEN
            SELECT date, team_id INTO slot_date, slot_team_id
            FROM public.slots
            WHERE id = test_slot_id;
            
            result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || format('["Step 2: Got slot info - date: %s, team_id: %s"]', slot_date, slot_team_id)::jsonb);
            
            -- Use slot information if available
            IF slot_date IS NOT NULL THEN
                attendance_date := slot_date;
            END IF;
            
            IF slot_team_id IS NOT NULL THEN
                attendance_team_id := slot_team_id;
            END IF;
        ELSE
            result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || '["Step 2: No slot_id provided"]'::jsonb);
        END IF;
        
        -- Step 3: Ensure non-null values
        IF attendance_date IS NULL THEN
            attendance_date := CURRENT_DATE;
        END IF;
        
        IF attendance_team_id IS NULL THEN
            attendance_team_id := test_team_id;
        END IF;
        
        result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || format('["Step 3: Final values - date: %s, team_id: %s"]', attendance_date, attendance_team_id)::jsonb);
        
        -- Step 4: Check for existing attendance
        IF test_slot_id IS NOT NULL THEN
            -- Check slot-based duplicate
            IF NOT EXISTS (
                SELECT 1 FROM public.attendances 
                WHERE player_id = test_player_id 
                AND slot_id = test_slot_id
                AND session_time = 'Match'
            ) THEN
                result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || '["Step 4: No existing slot-based attendance found, will create"]'::jsonb);
                
                -- Step 5: Insert attendance record
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
                    test_player_id,
                    attendance_team_id,
                    attendance_date,
                    'Match',
                    'auto',
                    'auto',
                    NULL,
                    test_slot_id
                );
                
                result := jsonb_set(result::jsonb, '{status}', '"success"');
                result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || '["Step 5: Successfully inserted attendance record"]'::jsonb);
            ELSE
                result := jsonb_set(result::jsonb, '{status}', '"duplicate_found"');
                result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || '["Step 4: Existing slot-based attendance found, skipping"]'::jsonb);
            END IF;
        ELSE
            -- Check date-based duplicate for non-slot performances
            IF NOT EXISTS (
                SELECT 1 FROM public.attendances 
                WHERE player_id = test_player_id 
                AND date = attendance_date 
                AND session_time = 'Match'
                AND team_id = attendance_team_id
                AND slot_id IS NULL
            ) THEN
                result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || '["Step 4: No existing date-based attendance found, will create"]'::jsonb);
                
                -- Step 5: Insert attendance record
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
                    test_player_id,
                    attendance_team_id,
                    attendance_date,
                    'Match',
                    'auto',
                    'auto',
                    NULL,
                    NULL
                );
                
                result := jsonb_set(result::jsonb, '{status}', '"success"');
                result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || '["Step 5: Successfully inserted attendance record"]'::jsonb);
            ELSE
                result := jsonb_set(result::jsonb, '{status}', '"duplicate_found"');
                result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || '["Step 4: Existing date-based attendance found, skipping"]'::jsonb);
            END IF;
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        error_msg := SQLERRM;
        result := jsonb_set(result::jsonb, '{status}', '"error"');
        result := jsonb_set(result::jsonb, '{error}', format('"%s"', error_msg)::jsonb);
        result := jsonb_set(result::jsonb, '{steps}', (result->'steps')::jsonb || format('["ERROR: %s"]', error_msg)::jsonb);
    END;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Example usage (replace with actual IDs from your database):
-- SELECT public.test_attendance_creation(
--     'player-uuid-here'::uuid,
--     'team-uuid-here'::uuid, 
--     'slot-uuid-here'::uuid
-- );