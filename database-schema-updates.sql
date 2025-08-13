-- Database Schema Updates for Missing Tables/Columns
-- Run this script to add missing schema elements that are not in the current database

-- Note: Based on the provided schema, most tables already exist.
-- This script only adds missing elements that might be referenced in the new components.

-- Add any missing columns to existing tables if needed
-- (Most columns appear to already exist in the provided schema)

-- Add training_details column to attendances table if it doesn't exist
-- This is used by the training session attendance system
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'training_details'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN training_details jsonb DEFAULT NULL;
    END IF;
END $$;

-- Add verification status and manager notes to attendances for training verification
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'verification_status'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN verification_status text DEFAULT 'pending' 
        CHECK (verification_status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text]));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'manager_notes'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN manager_notes text DEFAULT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'verified_by'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN verified_by uuid DEFAULT NULL,
        ADD CONSTRAINT attendances_verified_by_fkey 
        FOREIGN KEY (verified_by) REFERENCES public.users(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN verified_at timestamp with time zone DEFAULT NULL;
    END IF;
END $$;

-- Add source column to attendances table for tracking how attendance was marked
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'source'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN source text DEFAULT 'manual'
        CHECK (source = ANY (ARRAY['manual'::text, 'auto'::text, 'system'::text]));
    END IF;
END $$;

-- Add session_id column to attendances table for linking to sessions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' 
        AND column_name = 'session_id'
    ) THEN
        ALTER TABLE public.attendances 
        ADD COLUMN session_id uuid DEFAULT NULL,
        ADD CONSTRAINT attendances_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Update attendance status constraint to match current code expectations
-- Drop existing constraint and create new one with lowercase values
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendances_status_check' 
        AND table_name = 'attendances'
    ) THEN
        ALTER TABLE public.attendances DROP CONSTRAINT attendances_status_check;
    END IF;
    
    -- Add updated constraint
    ALTER TABLE public.attendances 
    ADD CONSTRAINT attendances_status_check 
    CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'auto'::text]));
END $$;

-- Update session_time constraint to match current code expectations  
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendances_session_time_check' 
        AND table_name = 'attendances'
    ) THEN
        ALTER TABLE public.attendances DROP CONSTRAINT attendances_session_time_check;
    END IF;
    
    -- Add updated constraint
    ALTER TABLE public.attendances 
    ADD CONSTRAINT attendances_session_time_check 
    CHECK (session_time = ANY (ARRAY['Morning'::text, 'Evening'::text, 'Night'::text, 'Match'::text, 'Scrims'::text]));
END $$;

-- Add name and description columns to sessions table for daily session manager
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN name text DEFAULT NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'max_participants'
    ) THEN
        ALTER TABLE public.sessions 
        ADD COLUMN max_participants integer DEFAULT NULL 
        CHECK (max_participants > 0 OR max_participants IS NULL);
    END IF;
END $$;

-- Add indexes for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_attendances_verification_status 
ON public.attendances(verification_status);

CREATE INDEX IF NOT EXISTS idx_attendances_date_team 
ON public.attendances(date, team_id);

CREATE INDEX IF NOT EXISTS idx_sessions_date_team 
ON public.sessions(date, team_id);

CREATE INDEX IF NOT EXISTS idx_slots_date_team 
ON public.slots(date, team_id);

CREATE INDEX IF NOT EXISTS idx_attendances_session_id 
ON public.attendances(session_id);

CREATE INDEX IF NOT EXISTS idx_attendances_source 
ON public.attendances(source);

-- Add RLS policies for new columns if needed
-- (Existing RLS policies should cover the new columns)

-- Create function to generate daily practice sessions if it doesn't exist
CREATE OR REPLACE FUNCTION generate_daily_practice_sessions(target_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function generates daily practice sessions based on practice_session_config
    -- Insert sessions for teams that have active configurations
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
    AND NOT EXISTS (
        -- Don't create if session already exists for this team/date/subtype
        SELECT 1 FROM public.sessions s
        WHERE s.team_id = psc.team_id
        AND s.date = target_date
        AND s.session_subtype = psc.session_subtype
        AND s.session_type = 'practice'
    );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION generate_daily_practice_sessions(date) TO authenticated;

-- Create function to auto-mark absence after cutoff time
CREATE OR REPLACE FUNCTION auto_mark_absent_after_cutoff()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Auto-mark players as absent for sessions where cutoff time has passed
    -- and they haven't marked attendance yet
    INSERT INTO public.attendances (
        player_id,
        team_id,
        session_id,
        date,
        session_time,
        status,
        source,
        marked_by
    )
    SELECT DISTINCT
        u.id as player_id,
        s.team_id,
        s.id as session_id,
        s.date,
        s.session_subtype as session_time,
        'absent' as status,
        'system' as source,
        NULL as marked_by
    FROM public.sessions s
    JOIN public.users u ON u.team_id = s.team_id
    WHERE s.date = CURRENT_DATE
    AND s.cutoff_time < CURRENT_TIME
    AND u.role = 'player'
    AND u.status = 'Active'
    AND NOT EXISTS (
        SELECT 1 FROM public.attendances a
        WHERE a.player_id = u.id
        AND a.date = s.date
        AND (a.session_id = s.id OR a.session_time = s.session_subtype)
    );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION auto_mark_absent_after_cutoff() TO authenticated;

-- Add comments for documentation
COMMENT ON COLUMN public.attendances.training_details IS 'JSON data for training session details including mode, hours, screenshots, etc.';
COMMENT ON COLUMN public.attendances.verification_status IS 'Status of manager verification for training attendance';
COMMENT ON COLUMN public.attendances.manager_notes IS 'Notes added by manager during verification process';
COMMENT ON COLUMN public.attendances.verified_by IS 'User ID of manager who verified the attendance';
COMMENT ON COLUMN public.attendances.verified_at IS 'Timestamp when attendance was verified';
COMMENT ON COLUMN public.attendances.source IS 'How the attendance was marked: manual, auto, or system';
COMMENT ON COLUMN public.attendances.session_id IS 'Link to the specific session for this attendance record';
COMMENT ON COLUMN public.sessions.name IS 'Custom name for the session';
COMMENT ON COLUMN public.sessions.max_participants IS 'Maximum number of participants allowed in the session';

-- Update any existing data if needed
-- Convert old status values to new lowercase format
UPDATE public.attendances 
SET status = CASE 
    WHEN status = 'Present' THEN 'present'
    WHEN status = 'Absent' THEN 'absent'
    WHEN status = 'Auto (Match)' THEN 'auto'
    ELSE LOWER(status)
END
WHERE status IN ('Present', 'Absent', 'Auto (Match)');

-- Fix the old trigger function to use correct status values and avoid conflicts
-- Drop the old trigger that conflicts with API-based attendance creation
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;

-- Update the trigger function to use correct status values
CREATE OR REPLACE FUNCTION public.create_auto_attendance()
RETURNS TRIGGER AS $$
DECLARE
  slot_date date;
  slot_team_id uuid;
BEGIN
  -- Get slot information if slot is linked to performance
  IF NEW.slot IS NOT NULL THEN
    SELECT date, team_id INTO slot_date, slot_team_id
    FROM public.slots
    WHERE id = NEW.slot;
    
    -- Use slot date and team_id if available
    IF slot_date IS NOT NULL AND slot_team_id IS NOT NULL THEN
      INSERT INTO public.attendances (player_id, team_id, date, session_time, status, source, marked_by, slot_id)
      SELECT 
        NEW.player_id,
        slot_team_id,
        slot_date,
        'Match',
        'auto',  -- Use lowercase status
        'auto',  -- Add source
        NULL,
        NEW.slot
      WHERE NOT EXISTS (
        SELECT 1 FROM public.attendances 
        WHERE player_id = NEW.player_id 
        AND date = slot_date 
        AND session_time = 'Match'
      );
    END IF;
  ELSE
    -- Fallback to current date if no slot information
    INSERT INTO public.attendances (player_id, team_id, date, session_time, status, source, marked_by, slot_id)
    SELECT 
      NEW.player_id,
      NEW.team_id,
      CURRENT_DATE,
      'Match',
      'auto',  -- Use lowercase status
      'auto',  -- Add source
      NULL,
      NULL
    WHERE NOT EXISTS (
      SELECT 1 FROM public.attendances 
      WHERE player_id = NEW.player_id 
      AND date = CURRENT_DATE 
      AND session_time = 'Match'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Don't recreate the trigger - let API handle attendance creation
-- This prevents conflicts between trigger and API-based attendance creation

COMMIT;