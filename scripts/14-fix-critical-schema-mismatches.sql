-- ====================================================================
-- CRITICAL SCHEMA FIXES FOR API COMPATIBILITY
-- ====================================================================
-- This script fixes only the critical schema mismatches causing API errors

-- ====================================================================
-- 1. FIX PERFORMANCES TABLE - ADD MISSING slot_id FIELD
-- ====================================================================

-- Add missing slot_id field to performances table
ALTER TABLE public.performances 
ADD COLUMN IF NOT EXISTS slot_id uuid REFERENCES public.slots(id);

-- Add missing foreign key constraint for slot_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'performances_slot_id_fkey' 
        AND table_name = 'performances'
    ) THEN
        ALTER TABLE public.performances 
        ADD CONSTRAINT performances_slot_id_fkey 
        FOREIGN KEY (slot_id) REFERENCES public.slots(id);
    END IF;
END $$;

-- ====================================================================
-- 2. FIX ATTENDANCES TABLE - ADD MISSING session_id FIELD
-- ====================================================================

-- Add missing session_id field to attendances table
ALTER TABLE public.attendances 
ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.sessions(id);

-- Add missing foreign key constraint for session_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attendances_session_id_fkey' 
        AND table_name = 'attendances'
    ) THEN
        ALTER TABLE public.attendances 
        ADD CONSTRAINT attendances_session_id_fkey 
        FOREIGN KEY (session_id) REFERENCES public.sessions(id);
    END IF;
END $$;

-- Add missing source field with default and check constraint
ALTER TABLE public.attendances 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' CHECK (source = ANY (ARRAY['manual', 'auto', 'system']));

-- ====================================================================
-- 3. FIX TEAMS TABLE - ADD MISSING coach_id FIELD
-- ====================================================================

-- Add missing coach_id field to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS coach_id uuid REFERENCES public.users(id);

-- Add missing foreign key constraint for coach_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'teams_coach_id_fkey' 
        AND table_name = 'teams'
    ) THEN
        ALTER TABLE public.teams 
        ADD CONSTRAINT teams_coach_id_fkey 
        FOREIGN KEY (coach_id) REFERENCES public.users(id);
    END IF;
END $$;

-- ====================================================================
-- 4. UPDATE ATTENDANCE TRIGGER TO USE slot_id INSTEAD OF slot
-- ====================================================================

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS auto_match_attendance_on_performance ON public.performances;

-- Create updated trigger function
CREATE OR REPLACE FUNCTION public.create_match_attendance_from_performance()
RETURNS TRIGGER AS $$
DECLARE
    match_session_id uuid;
    performance_date date;
BEGIN
    -- Determine the date for the performance
    performance_date := CURRENT_DATE;
    IF NEW.slot_id IS NOT NULL THEN
        SELECT date INTO performance_date FROM public.slots WHERE id = NEW.slot_id;
    END IF;

    -- Create or get match session for this team and date
    INSERT INTO public.sessions (
        team_id, 
        session_type, 
        session_subtype, 
        date, 
        title,
        is_mandatory,
        created_by
    )
    SELECT 
        NEW.team_id,
        'tournament',
        'Scrims',
        performance_date,
        'Auto-generated Scrims Session',
        false,
        NEW.player_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.sessions 
        WHERE team_id = NEW.team_id 
        AND date = performance_date 
        AND session_type = 'tournament'
        AND session_subtype = 'Scrims'
    )
    RETURNING id INTO match_session_id;

    -- Get session id if it already exists
    IF match_session_id IS NULL THEN
        SELECT id INTO match_session_id 
        FROM public.sessions 
        WHERE team_id = NEW.team_id 
        AND date = performance_date 
        AND session_type = 'tournament'
        AND session_subtype = 'Scrims';
    END IF;

    -- Create attendance record
    INSERT INTO public.attendances (
        player_id, 
        team_id, 
        session_id, 
        status, 
        source,
        slot_id
    )
    SELECT 
        NEW.player_id,
        NEW.team_id,
        match_session_id,
        'present',
        'auto',
        NEW.slot_id
    WHERE NOT EXISTS (
        SELECT 1 FROM public.attendances 
        WHERE player_id = NEW.player_id 
        AND session_id = match_session_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the updated trigger
CREATE TRIGGER auto_match_attendance_on_performance
    AFTER INSERT ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.create_match_attendance_from_performance();

-- ====================================================================
-- 5. VERIFICATION
-- ====================================================================

-- Verify that all required fields exist
DO $$
BEGIN
    -- Check performances table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performances' AND column_name = 'slot_id') THEN
        RAISE EXCEPTION 'slot_id column missing from performances table';
    END IF;
    
    -- Check attendances table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendances' AND column_name = 'session_id') THEN
        RAISE EXCEPTION 'session_id column missing from attendances table';
    END IF;
    
    -- Check teams table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'coach_id') THEN
        RAISE EXCEPTION 'coach_id column missing from teams table';
    END IF;
    
    RAISE NOTICE 'Critical schema fixes completed successfully!';
END $$;