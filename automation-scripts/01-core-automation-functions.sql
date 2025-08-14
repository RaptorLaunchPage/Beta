-- ====================================================================
-- 🔧 CORE AUTOMATION FUNCTIONS - SCRIPT #1
-- ====================================================================
-- This script creates the foundational automation functions
-- Run this first as other scripts depend on these functions

-- ====================================================================
-- 1. UTILITY FUNCTIONS
-- ====================================================================

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync user profile data between users and profiles tables
CREATE OR REPLACE FUNCTION public.sync_user_profile_data()
RETURNS trigger AS $$
BEGIN
  -- Update profiles table when users table is updated
  INSERT INTO public.profiles (user_id, full_name, display_name, contact_number, experience, preferred_role, favorite_games, role, onboarding_completed)
  VALUES (NEW.id, NEW.full_name, NEW.display_name, NEW.contact_number, NEW.experience, NEW.preferred_role, NEW.favorite_games, NEW.role, NEW.onboarding_completed)
  ON CONFLICT (user_id) 
  DO UPDATE SET
    full_name = EXCLUDED.full_name,
    display_name = EXCLUDED.display_name,
    contact_number = EXCLUDED.contact_number,
    experience = EXCLUDED.experience,
    preferred_role = EXCLUDED.preferred_role,
    favorite_games = EXCLUDED.favorite_games,
    role = EXCLUDED.role,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last login timestamp
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_login = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 2. VALIDATION FUNCTIONS
-- ====================================================================

-- Function to validate coach assignment
CREATE OR REPLACE FUNCTION public.validate_coach_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure coach exists and has coach role
    IF NEW.coach_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = NEW.coach_id 
            AND role = 'coach'
        ) THEN
            RAISE EXCEPTION 'Assigned coach must have coach role';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate performance entries
CREATE OR REPLACE FUNCTION public.validate_performance_entry()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure player belongs to the team
    IF NEW.player_id IS NOT NULL AND NEW.team_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = NEW.player_id 
            AND team_id = NEW.team_id
        ) THEN
            RAISE EXCEPTION 'Player must belong to the specified team';
        END IF;
    END IF;
    
    -- Ensure slot exists if specified
    IF NEW.slot IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.slots 
            WHERE id = NEW.slot
        ) THEN
            RAISE EXCEPTION 'Specified slot does not exist';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 3. UTILITY FUNCTIONS
-- ====================================================================

-- Function to get team performance summary
CREATE OR REPLACE FUNCTION public.get_team_performance_summary(team_uuid UUID)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_matches', COUNT(*),
        'total_kills', COALESCE(SUM(kills), 0),
        'total_damage', COALESCE(SUM(damage), 0),
        'avg_placement', COALESCE(AVG(placement), 0),
        'total_winnings', COALESCE(SUM(w.amount_won), 0)
    ) INTO result
    FROM public.performances p
    LEFT JOIN public.winnings w ON w.slot_id = p.slot AND w.team_id = p.team_id
    WHERE p.team_id = team_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get player statistics
CREATE OR REPLACE FUNCTION public.get_player_stats(player_uuid UUID)
RETURNS json AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'total_matches', COUNT(*),
        'total_kills', COALESCE(SUM(kills), 0),
        'total_assists', COALESCE(SUM(assists), 0),
        'total_damage', COALESCE(SUM(damage), 0),
        'avg_placement', COALESCE(AVG(placement), 0),
        'best_placement', MIN(placement),
        'total_survival_time', COALESCE(SUM(survival_time), 0)
    ) INTO result
    FROM public.performances
    WHERE player_id = player_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 4. GRANT PERMISSIONS
-- ====================================================================

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_profile_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_last_login() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coach_assignment() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_performance_entry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_performance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_stats(UUID) TO authenticated;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Core automation functions created successfully!';
    RAISE NOTICE '📊 Created % utility functions', 7;
    RAISE NOTICE '🔧 Ready for next automation script!';
END $$;