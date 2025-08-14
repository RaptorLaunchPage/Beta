-- ====================================================================
-- ⚡ TRIGGERS SETUP - SCRIPT #5
-- ====================================================================
-- This script creates all triggers that use the automation functions
-- Run this after all function scripts are complete

-- ====================================================================
-- 1. UTILITY TRIGGERS
-- ====================================================================

-- Trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to sync user profile data
DROP TRIGGER IF EXISTS sync_user_profile_trigger ON public.users;
CREATE TRIGGER sync_user_profile_trigger
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_profile_data();

-- ====================================================================
-- 2. VALIDATION TRIGGERS
-- ====================================================================

-- Trigger for coach validation
DROP TRIGGER IF EXISTS validate_coach_assignment_trigger ON public.teams;
CREATE TRIGGER validate_coach_assignment_trigger
    BEFORE INSERT OR UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_coach_assignment();

-- Trigger for performance validation
DROP TRIGGER IF EXISTS validate_performance_entry_trigger ON public.performances;
CREATE TRIGGER validate_performance_entry_trigger
    BEFORE INSERT OR UPDATE ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_performance_entry();

-- ====================================================================
-- 3. ATTENDANCE AUTOMATION TRIGGERS
-- ====================================================================

-- Trigger to auto-create attendance on performance entry
DROP TRIGGER IF EXISTS auto_attendance_on_performance ON public.performances;
CREATE TRIGGER auto_attendance_on_performance
    AFTER INSERT ON public.performances
    FOR EACH ROW
    EXECUTE FUNCTION public.create_auto_attendance_fixed();

-- ====================================================================
-- 4. BUSINESS LOGIC TRIGGERS
-- ====================================================================

-- Trigger to auto-generate expense entries for slots
DROP TRIGGER IF EXISTS trigger_create_slot_expense ON public.slots;
CREATE TRIGGER trigger_create_slot_expense
    AFTER INSERT ON public.slots
    FOR EACH ROW
    EXECUTE FUNCTION public.create_slot_expense();

-- Trigger for tryout application sync
DROP TRIGGER IF EXISTS trigger_sync_tryout_to_profile ON public.tryout_applications;
CREATE TRIGGER trigger_sync_tryout_to_profile
    AFTER INSERT OR UPDATE ON public.tryout_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_tryout_to_profile();

-- ====================================================================
-- 5. DISCORD AUTOMATION TRIGGERS
-- ====================================================================

-- Trigger to notify Discord on slot creation
DROP TRIGGER IF EXISTS trigger_slot_creation_notification ON public.slots;
CREATE TRIGGER trigger_slot_creation_notification
    AFTER INSERT ON public.slots
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_slot_creation_notification();

-- Trigger to notify Discord on roster updates
DROP TRIGGER IF EXISTS trigger_roster_update_notification ON public.rosters;
CREATE TRIGGER trigger_roster_update_notification
    AFTER INSERT OR UPDATE ON public.rosters
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_roster_update_notification();

-- ====================================================================
-- 6. VERIFY TRIGGERS
-- ====================================================================

-- Check what triggers were created
DO $$
DECLARE
    trigger_count integer;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';
    
    RAISE NOTICE '✅ Triggers setup completed successfully!';
    RAISE NOTICE '⚡ Created % triggers', trigger_count;
    RAISE NOTICE '🔧 All automation functions are now active!';
END $$;