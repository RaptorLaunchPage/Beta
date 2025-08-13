-- ====================================================================
-- 🔒 AGREEMENT ENFORCEMENT SYSTEM - DATABASE SETUP
-- ====================================================================
-- Run this script in your Supabase SQL Editor

-- ====================================================================
-- 1. CREATE TABLES
-- ====================================================================

-- User agreements tracking table
CREATE TABLE public.user_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['player'::text, 'coach'::text, 'manager'::text, 'analyst'::text, 'tryout'::text, 'admin'::text, 'pending_player'::text])),
  agreement_version integer NOT NULL,
  accepted_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  status text NOT NULL DEFAULT 'accepted' CHECK (status = ANY (ARRAY['accepted'::text, 'pending'::text, 'declined'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_agreements_pkey PRIMARY KEY (id),
  CONSTRAINT user_agreements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT user_agreements_unique_user_role UNIQUE (user_id, role)
);

-- ====================================================================
-- 2. INSERT SYSTEM SETTINGS FOR AGREEMENT ENFORCEMENT
-- ====================================================================

-- Add agreement enforcement toggle to admin_config
INSERT INTO public.admin_config (key, value) 
VALUES ('agreement_enforcement_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Add development override setting
INSERT INTO public.admin_config (key, value) 
VALUES ('agreement_dev_override', 'false')
ON CONFLICT (key) DO NOTHING;

-- ====================================================================
-- 3. CREATE INDEXES
-- ====================================================================

CREATE INDEX idx_user_agreements_user_id ON public.user_agreements(user_id);
CREATE INDEX idx_user_agreements_role ON public.user_agreements(role);
CREATE INDEX idx_user_agreements_status ON public.user_agreements(status);
CREATE INDEX idx_user_agreements_user_role ON public.user_agreements(user_id, role);

-- ====================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ====================================================================

ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. CREATE RLS POLICIES
-- ====================================================================

-- Users can view their own agreements
CREATE POLICY "Users can view own agreements" ON public.user_agreements
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own agreements
CREATE POLICY "Users can insert own agreements" ON public.user_agreements
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admins can view all agreements
CREATE POLICY "Admins can view all agreements" ON public.user_agreements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can manage all agreements
CREATE POLICY "Admins can manage all agreements" ON public.user_agreements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ====================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ====================================================================

-- Function to check if user needs to accept agreement
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
-- SETUP COMPLETE! 
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '🔒 AGREEMENT ENFORCEMENT SYSTEM SETUP COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ user_agreements table created';
    RAISE NOTICE '✅ System settings added to admin_config';
    RAISE NOTICE '✅ Indexes and RLS policies configured';
    RAISE NOTICE '✅ Helper functions created';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to implement frontend components!';
    RAISE NOTICE '';
    RAISE NOTICE 'Default settings:';
    RAISE NOTICE '  - Agreement enforcement: DISABLED';
    RAISE NOTICE '  - Development override: DISABLED';
    RAISE NOTICE '';
    RAISE NOTICE 'Enable via Admin Panel: /dashboard/admin/settings';
END $$;
