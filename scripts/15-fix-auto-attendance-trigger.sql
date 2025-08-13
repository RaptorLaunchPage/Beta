-- Align auto attendance with current schema (session-attendance model)
-- Drops legacy trigger/function and recreates a compatible version

-- Drop old trigger and function if present
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
DROP FUNCTION IF EXISTS public.create_auto_attendance();

-- Create a new function that inserts an attendance row with a non-null date
-- Uses slot date when available; falls back to CURRENT_DATE
-- Sets status to 'present' and source to 'auto' for compatibility with new checks
CREATE OR REPLACE FUNCTION public.create_auto_attendance_v2()
RETURNS TRIGGER AS $$
DECLARE
  slot_date date;
  slot_team_id uuid;
BEGIN
  IF NEW.slot IS NOT NULL THEN
    SELECT date, team_id INTO slot_date, slot_team_id
    FROM public.slots
    WHERE id = NEW.slot;

    IF slot_date IS NOT NULL AND slot_team_id IS NOT NULL THEN
      INSERT INTO public.attendances (player_id, team_id, date, session_time, status, source, marked_by, slot_id)
      SELECT 
        NEW.player_id,
        slot_team_id,
        slot_date,
        'Match',
        'present',     -- new schema allowed values
        'auto',        -- track source
        NULL,
        NEW.slot
      WHERE NOT EXISTS (
        SELECT 1 FROM public.attendances 
        WHERE player_id = NEW.player_id 
          AND date = slot_date 
          AND session_time = 'Match'
      );
    ELSE
      -- slot exists but missing date/team -> fallback to current_date
      INSERT INTO public.attendances (player_id, team_id, date, session_time, status, source, marked_by, slot_id)
      VALUES (
        NEW.player_id,
        NEW.team_id,
        CURRENT_DATE,
        'Match',
        'present',
        'auto',
        NULL,
        NEW.slot
      )
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    -- No slot reference: fallback to current date
    INSERT INTO public.attendances (player_id, team_id, date, session_time, status, source, marked_by, slot_id)
    VALUES (
      NEW.player_id,
      NEW.team_id,
      CURRENT_DATE,
      'Match',
      'present',
      'auto',
      NULL,
      NULL
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER auto_attendance_on_performance
  AFTER INSERT ON public.performances
  FOR EACH ROW
  EXECUTE FUNCTION public.create_auto_attendance_v2();