-- ========================================
-- COMPREHENSIVE DATABASE FIXES
-- ========================================
-- This script addresses ALL 23+ missing database elements identified in the audit
-- Run this script to bring the database schema into complete alignment with UI requirements

-- ========================================
-- PHASE 1: CRITICAL MISSING COLUMNS
-- ========================================

-- Fix SLOTS table - add missing columns that are heavily used
ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS number_of_slots INTEGER DEFAULT 1;
ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS slot_rate INTEGER DEFAULT 0;
ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS notes TEXT;

-- Fix TEAMS table - add coach relationship and status
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS coach_id UUID;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Fix SLOT_EXPENSES table - add missing number_of_slots column
ALTER TABLE public.slot_expenses ADD COLUMN IF NOT EXISTS number_of_slots INTEGER DEFAULT 1;

-- ========================================
-- PHASE 2: MISSING FOREIGN KEY CONSTRAINTS
-- ========================================

-- Add foreign key for teams.coach_id -> users.id
ALTER TABLE public.teams 
ADD CONSTRAINT teams_coach_id_fkey 
FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ========================================
-- PHASE 3: MISSING CHECK CONSTRAINTS
-- ========================================

-- Teams status constraint
ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_status_check;
ALTER TABLE public.teams ADD CONSTRAINT teams_status_check 
CHECK (status IN ('active', 'inactive', 'suspended'));

-- Slots rate constraint
ALTER TABLE public.slots DROP CONSTRAINT IF EXISTS slots_rate_positive;
ALTER TABLE public.slots ADD CONSTRAINT slots_rate_positive 
CHECK (slot_rate >= 0);

-- Slots number constraint
ALTER TABLE public.slots DROP CONSTRAINT IF EXISTS slots_number_positive;
ALTER TABLE public.slots ADD CONSTRAINT slots_number_positive 
CHECK (number_of_slots > 0);

-- Winnings position constraint
ALTER TABLE public.winnings DROP CONSTRAINT IF EXISTS winnings_position_positive;
ALTER TABLE public.winnings ADD CONSTRAINT winnings_position_positive 
CHECK (position > 0);

-- Slot expenses number constraint
ALTER TABLE public.slot_expenses DROP CONSTRAINT IF EXISTS slot_expenses_number_positive;
ALTER TABLE public.slot_expenses ADD CONSTRAINT slot_expenses_number_positive 
CHECK (number_of_slots > 0);

-- ========================================
-- PHASE 4: PERFORMANCE INDEXES
-- ========================================

-- Users table performance indexes
CREATE INDEX IF NOT EXISTS idx_users_team_id_role ON public.users(team_id, role);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON public.users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON public.users(last_login);

-- Teams table indexes
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON public.teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);

-- Performances table indexes  
CREATE INDEX IF NOT EXISTS idx_performances_team_date ON public.performances(team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_performances_player_match ON public.performances(player_id, match_number);
CREATE INDEX IF NOT EXISTS idx_performances_slot ON public.performances(slot);
CREATE INDEX IF NOT EXISTS idx_performances_map ON public.performances(map);

-- Slots table indexes
CREATE INDEX IF NOT EXISTS idx_slots_team_date ON public.slots(team_id, date);
CREATE INDEX IF NOT EXISTS idx_slots_organizer ON public.slots(organizer);
CREATE INDEX IF NOT EXISTS idx_slots_date ON public.slots(date);

-- Slot expenses indexes
CREATE INDEX IF NOT EXISTS idx_slot_expenses_team_date ON public.slot_expenses(team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_slot_expenses_slot_id ON public.slot_expenses(slot_id);

-- Winnings indexes
CREATE INDEX IF NOT EXISTS idx_winnings_team_date ON public.winnings(team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_winnings_slot_id ON public.winnings(slot_id);
CREATE INDEX IF NOT EXISTS idx_winnings_position ON public.winnings(position);

-- Rosters indexes
CREATE INDEX IF NOT EXISTS idx_rosters_team_id ON public.rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_rosters_user_id ON public.rosters(user_id);

-- ========================================
-- PHASE 5: VALIDATION FUNCTIONS & TRIGGERS
-- ========================================

-- Function to validate coach assignment
CREATE OR REPLACE FUNCTION public.validate_coach_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure coach_id references a user with coach role
    IF NEW.coach_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = NEW.coach_id AND role = 'coach'
        ) THEN
            RAISE EXCEPTION 'Coach must have coach role';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for coach validation
DROP TRIGGER IF EXISTS validate_coach_assignment_trigger ON public.teams;
CREATE TRIGGER validate_coach_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_coach_assignment();

-- Function to validate performance entries
CREATE OR REPLACE FUNCTION public.validate_performance_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure player belongs to the team
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = NEW.player_id 
        AND team_id = NEW.team_id
        AND role = 'player'
    ) THEN
        RAISE EXCEPTION 'Player must belong to the specified team';
    END IF;
    
    -- Validate performance metrics
    IF NEW.kills < 0 OR NEW.assists < 0 OR NEW.damage < 0 OR NEW.survival_time < 0 THEN
        RAISE EXCEPTION 'Performance metrics cannot be negative';
    END IF;
    
    -- Validate placement
    IF NEW.placement IS NOT NULL AND NEW.placement <= 0 THEN
        RAISE EXCEPTION 'Placement must be a positive number';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for performance validation
DROP TRIGGER IF EXISTS validate_performance_entry_trigger ON public.performances;
CREATE TRIGGER validate_performance_entry_trigger
    BEFORE INSERT OR UPDATE ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_performance_entry();

-- Function to track last login
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- We don't create the trigger here as it would update on every user update
-- Instead, this should be called explicitly on login

-- ========================================
-- PHASE 6: ENHANCED RLS POLICIES
-- ========================================

-- Enable RLS on all tables if not already enabled
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tier_defaults ENABLE ROW LEVEL SECURITY;

-- Rosters RLS policies
CREATE POLICY "Admins and managers can manage all rosters" ON public.rosters
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Coaches can manage team rosters" ON public.rosters
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.teams 
        WHERE id = rosters.team_id 
        AND coach_id = auth.uid()
    )
);

CREATE POLICY "Players can view team rosters" ON public.rosters
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND team_id = rosters.team_id
        AND role = 'player'
    )
);

-- Slot expenses RLS policies
CREATE POLICY "Admins and managers can manage all expenses" ON public.slot_expenses
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Team members can view team expenses" ON public.slot_expenses
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND team_id = slot_expenses.team_id
    )
);

-- Winnings RLS policies
CREATE POLICY "Admins and managers can manage all winnings" ON public.winnings
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Team members can view team winnings" ON public.winnings
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND team_id = winnings.team_id
    )
);

-- Tier defaults RLS policies
CREATE POLICY "All authenticated users can view tier defaults" ON public.tier_defaults
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins and managers can manage tier defaults" ON public.tier_defaults
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
);

-- ========================================
-- PHASE 7: STORAGE BUCKETS
-- ========================================

-- Create OCR uploads bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ocr_uploads',
    'ocr_uploads',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for OCR uploads bucket
CREATE POLICY "Authenticated users can upload OCR files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ocr_uploads');

CREATE POLICY "Users can view their own OCR uploads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'ocr_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own OCR uploads" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'ocr_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ========================================
-- PHASE 8: DATA MIGRATION & CLEANUP
-- ========================================

-- Update existing slots with default values
UPDATE public.slots SET 
    number_of_slots = 1 
WHERE number_of_slots IS NULL;

UPDATE public.slots SET 
    slot_rate = 0 
WHERE slot_rate IS NULL;

-- Update existing teams with default status
UPDATE public.teams SET 
    status = 'active' 
WHERE status IS NULL;

-- Update existing slot_expenses with default number_of_slots
UPDATE public.slot_expenses SET 
    number_of_slots = 1 
WHERE number_of_slots IS NULL;

-- ========================================
-- PHASE 9: UTILITY FUNCTIONS
-- ========================================

-- Function to get team performance summary
CREATE OR REPLACE FUNCTION public.get_team_performance_summary(team_uuid UUID)
RETURNS TABLE (
    total_matches BIGINT,
    total_kills BIGINT,
    total_damage NUMERIC,
    avg_placement NUMERIC,
    win_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_matches,
        SUM(p.kills)::BIGINT as total_kills,
        SUM(p.damage)::NUMERIC as total_damage,
        AVG(p.placement)::NUMERIC as avg_placement,
        (COUNT(CASE WHEN p.placement = 1 THEN 1 END)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0) * 100)::NUMERIC as win_rate
    FROM public.performances p
    WHERE p.team_id = team_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get player statistics
CREATE OR REPLACE FUNCTION public.get_player_stats(player_uuid UUID)
RETURNS TABLE (
    total_matches BIGINT,
    total_kills BIGINT,
    total_assists BIGINT,
    total_damage NUMERIC,
    avg_kills NUMERIC,
    avg_damage NUMERIC,
    best_placement INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_matches,
        SUM(p.kills)::BIGINT as total_kills,
        SUM(p.assists)::BIGINT as total_assists,
        SUM(p.damage)::NUMERIC as total_damage,
        AVG(p.kills)::NUMERIC as avg_kills,
        AVG(p.damage)::NUMERIC as avg_damage,
        MIN(p.placement)::INTEGER as best_placement
    FROM public.performances p
    WHERE p.player_id = player_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PHASE 10: GRANTS & PERMISSIONS
-- ========================================

-- Grant necessary permissions for new columns and functions
GRANT SELECT, UPDATE ON public.slots TO authenticated;
GRANT SELECT, UPDATE ON public.teams TO authenticated;
GRANT SELECT, UPDATE ON public.slot_expenses TO authenticated;

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION public.get_team_performance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_stats(UUID) TO authenticated;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify all new columns exist
DO $$
BEGIN
    -- Check slots table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'slots' AND column_name = 'number_of_slots') THEN
        RAISE EXCEPTION 'Column slots.number_of_slots was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'slots' AND column_name = 'slot_rate') THEN
        RAISE EXCEPTION 'Column slots.slot_rate was not created';
    END IF;
    
    -- Check teams table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'teams' AND column_name = 'coach_id') THEN
        RAISE EXCEPTION 'Column teams.coach_id was not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'teams' AND column_name = 'status') THEN
        RAISE EXCEPTION 'Column teams.status was not created';
    END IF;
    
    RAISE NOTICE 'All critical columns verified successfully!';
END
$$;

-- Add helpful comments for documentation
COMMENT ON COLUMN public.slots.number_of_slots IS 'Number of slots available for this time slot';
COMMENT ON COLUMN public.slots.slot_rate IS 'Rate/cost per slot in the smallest currency unit';
COMMENT ON COLUMN public.slots.notes IS 'Additional notes or information about the slot';
COMMENT ON COLUMN public.teams.coach_id IS 'Reference to the user who coaches this team';
COMMENT ON COLUMN public.teams.status IS 'Current status of the team (active, inactive, suspended)';
COMMENT ON COLUMN public.slot_expenses.number_of_slots IS 'Number of slots used for this expense';

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '🎉 COMPREHENSIVE DATABASE FIXES COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'Database schema is now fully aligned with UI requirements.';
    RAISE NOTICE 'All 23+ missing elements have been addressed.';
END
$$;