-- ====================================================================
-- 🚨 EMERGENCY AGREEMENT FIX
-- ====================================================================
-- Run this immediately to fix the current issue

-- 1. Disable agreement enforcement temporarily
UPDATE public.admin_config 
SET value = 'false' 
WHERE key = 'agreement_enforcement_enabled';

-- 2. Enable development override
UPDATE public.admin_config 
SET value = 'true' 
WHERE key = 'agreement_dev_override';

-- 3. Update the agreement status function to exclude admins
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

-- 4. Provide immediate feedback
DO $$
BEGIN
    RAISE NOTICE '🚨 EMERGENCY FIX APPLIED!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Agreement enforcement disabled';
    RAISE NOTICE '✅ Development override enabled';
    RAISE NOTICE '✅ Admin bypass function updated';
    RAISE NOTICE '';
    RAISE NOTICE '🔄 Please refresh your browser and try logging in again.';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  You can re-enable enforcement after setting up all agreements properly.';
END $$;
