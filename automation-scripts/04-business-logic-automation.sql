-- ====================================================================
-- 💼 BUSINESS LOGIC AUTOMATION - SCRIPT #4
-- ====================================================================
-- This script creates automation functions for business logic
-- Run this after Discord portal automation

-- ====================================================================
-- 1. SLOT EXPENSE AUTOMATION
-- ====================================================================

-- Function to auto-generate expense entries for slots
CREATE OR REPLACE FUNCTION public.create_slot_expense()
RETURNS TRIGGER AS $$
BEGIN
    -- Create expense entry when a slot is created
    INSERT INTO public.slot_expenses (
        slot_id,
        team_id,
        rate,
        total,
        number_of_slots
    ) VALUES (
        NEW.id,
        NEW.team_id,
        NEW.slot_rate,
        NEW.slot_rate * NEW.number_of_slots,
        NEW.number_of_slots
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 2. PROFILE SYNC AUTOMATION
-- ====================================================================

-- Function to sync tryout application data to user profile
CREATE OR REPLACE FUNCTION public.sync_tryout_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user profile when tryout application is created/updated
    UPDATE public.users 
    SET 
        full_name = COALESCE(NEW.full_name, full_name),
        contact_number = COALESCE(NEW.contact_phone, contact_number),
        email = COALESCE(NEW.contact_email, email),
        updated_at = now()
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 3. PROFILE VISIBILITY FUNCTIONS
-- ====================================================================

-- Function to check if a user can view another user's profile
CREATE OR REPLACE FUNCTION public.can_view_profile(viewer_user_id UUID, target_user_id UUID)
RETURNS boolean AS $$
DECLARE
    viewer_role text;
    viewer_team_id uuid;
    target_visibility text;
    target_team_id uuid;
BEGIN
    -- Get viewer info
    SELECT role, team_id INTO viewer_role, viewer_team_id
    FROM public.users WHERE id = viewer_user_id;
    
    -- Get target user info
    SELECT profile_visibility, team_id INTO target_visibility, target_team_id
    FROM public.users WHERE id = target_user_id;
    
    -- Admin can view all profiles
    IF viewer_role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Users can always view their own profile
    IF viewer_user_id = target_user_id THEN
        RETURN true;
    END IF;
    
    -- Check visibility settings
    CASE target_visibility
        WHEN 'public' THEN
            RETURN true;
        WHEN 'team' THEN
            -- Team members can view each other's profiles
            RETURN viewer_team_id = target_team_id;
        WHEN 'private' THEN
            -- Only admins and self can view private profiles
            RETURN false;
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can edit another user's profile
CREATE OR REPLACE FUNCTION public.can_edit_profile(editor_user_id UUID, target_user_id UUID)
RETURNS boolean AS $$
DECLARE
    editor_role text;
    editor_team_id uuid;
    target_team_id uuid;
BEGIN
    -- Get editor info
    SELECT role, team_id INTO editor_role, editor_team_id
    FROM public.users WHERE id = editor_user_id;
    
    -- Get target user info
    SELECT team_id INTO target_team_id
    FROM public.users WHERE id = target_user_id;
    
    -- Admin can edit all profiles
    IF editor_role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Users can always edit their own profile
    IF editor_user_id = target_user_id THEN
        RETURN true;
    END IF;
    
    -- Managers can edit team member profiles
    IF editor_role = 'manager' AND editor_team_id = target_team_id THEN
        RETURN true;
    END IF;
    
    -- Coaches can edit team member profiles
    IF editor_role = 'coach' AND editor_team_id = target_team_id THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 4. AGREEMENT ENFORCEMENT FUNCTION
-- ====================================================================

-- Function to check user agreement status (if not already created)
CREATE OR REPLACE FUNCTION public.check_user_agreement_status(
  p_user_id uuid,
  p_role text,
  p_required_version integer
) RETURNS jsonb AS $$
DECLARE
  agreement_record public.user_agreements%ROWTYPE;
  enforcement_enabled boolean;
  dev_override boolean;
BEGIN
  -- Check if enforcement is enabled
  SELECT CASE WHEN value = 'true' THEN true ELSE false END INTO enforcement_enabled
  FROM public.admin_config WHERE key = 'agreement_enforcement_enabled';
  
  -- Check dev override
  SELECT CASE WHEN value = 'true' THEN true ELSE false END INTO dev_override
  FROM public.admin_config WHERE key = 'agreement_dev_override';
  
  -- If enforcement disabled or dev override, allow access
  IF NOT COALESCE(enforcement_enabled, false) OR COALESCE(dev_override, false) THEN
    RETURN jsonb_build_object(
      'requires_agreement', false,
      'status', 'bypassed',
      'message', 'Agreement enforcement disabled'
    );
  END IF;
  
  -- Skip agreement enforcement for admin users
  IF p_role = 'admin' THEN
    RETURN jsonb_build_object(
      'requires_agreement', false,
      'status', 'admin_bypass',
      'message', 'Admin users are exempt from agreement enforcement'
    );
  END IF;
  
  -- Get user's agreement record
  SELECT * INTO agreement_record
  FROM public.user_agreements
  WHERE user_id = p_user_id AND role = p_role;
  
  -- No agreement found
  IF agreement_record IS NULL THEN
    RETURN jsonb_build_object(
      'requires_agreement', true,
      'status', 'missing',
      'current_version', 0,
      'required_version', p_required_version,
      'message', 'No agreement found for role'
    );
  END IF;
  
  -- Agreement declined
  IF agreement_record.status = 'declined' THEN
    RETURN jsonb_build_object(
      'requires_agreement', true,
      'status', 'declined',
      'current_version', agreement_record.agreement_version,
      'required_version', p_required_version,
      'message', 'Agreement was declined'
    );
  END IF;
  
  -- Agreement pending
  IF agreement_record.status = 'pending' THEN
    RETURN jsonb_build_object(
      'requires_agreement', true,
      'status', 'pending',
      'current_version', agreement_record.agreement_version,
      'required_version', p_required_version,
      'message', 'Agreement acceptance pending'
    );
  END IF;
  
  -- Check version
  IF agreement_record.agreement_version < p_required_version THEN
    RETURN jsonb_build_object(
      'requires_agreement', true,
      'status', 'outdated',
      'current_version', agreement_record.agreement_version,
      'required_version', p_required_version,
      'message', 'Agreement version is outdated'
    );
  END IF;
  
  -- All good
  RETURN jsonb_build_object(
    'requires_agreement', false,
    'status', 'current',
    'current_version', agreement_record.agreement_version,
    'required_version', p_required_version,
    'message', 'Agreement is current'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 5. GRANT PERMISSIONS
-- ====================================================================

-- Grant execute permissions on business logic functions
GRANT EXECUTE ON FUNCTION public.create_slot_expense() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_tryout_to_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_profile(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_agreement_status(UUID, text, integer) TO authenticated;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Business Logic automation functions created successfully!';
    RAISE NOTICE '💼 Created % business logic functions', 5;
    RAISE NOTICE '🔧 Ready for next automation script!';
END $$;