-- ====================================================================
-- 🦖 RAPTORS ESPORTS TRYOUTS MODULE - COMPLETE DATABASE SETUP
-- ====================================================================
-- Run this script in your Supabase SQL Editor

-- ====================================================================
-- 1. CREATE TABLES
-- ====================================================================

-- Main tryouts table for campaigns
CREATE TABLE public.tryouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  purpose text NOT NULL CHECK (purpose = ANY (ARRAY['new_team'::text, 'existing_team'::text, 'role_based'::text])),
  target_roles text[] DEFAULT '{}',
  team_ids uuid[] DEFAULT '{}',
  type text NOT NULL CHECK (type = ANY (ARRAY['scrim'::text, 'tournament'::text, 'practice'::text, 'meeting'::text])),
  open_to_public boolean DEFAULT true,
  application_deadline timestamp with time zone,
  evaluation_method text NOT NULL CHECK (evaluation_method = ANY (ARRAY['manual'::text, 'automated'::text, 'mixed'::text])),
  additional_links jsonb DEFAULT '[]',
  status text NOT NULL DEFAULT 'draft' CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text, 'completed'::text, 'archived'::text])),
  description text,
  requirements text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  launched_at timestamp with time zone,
  closed_at timestamp with time zone,
  CONSTRAINT tryouts_pkey PRIMARY KEY (id),
  CONSTRAINT tryouts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Public applications from potential players
CREATE TABLE public.tryout_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  full_name text NOT NULL,
  ign text NOT NULL,
  discord_tag text,
  role_applied_for text,
  game_id text,
  availability text[] DEFAULT '{}',
  highlights_links text[] DEFAULT '{}',
  additional_notes text,
  contact_email text,
  contact_phone text,
  status text NOT NULL DEFAULT 'applied' CHECK (status = ANY (ARRAY['applied'::text, 'screened'::text, 'shortlisted'::text, 'rejected'::text, 'withdrawn'::text])),
  screening_notes text,
  screened_by uuid,
  screened_at timestamp with time zone,
  application_source text DEFAULT 'direct',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tryout_applications_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_applications_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id) ON DELETE CASCADE,
  CONSTRAINT tryout_applications_screened_by_fkey FOREIGN KEY (screened_by) REFERENCES public.users(id)
);

-- Invitations for shortlisted candidates
CREATE TABLE public.tryout_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  application_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'invited' CHECK (status = ANY (ARRAY['invited'::text, 'accepted'::text, 'declined'::text, 'expired'::text])),
  invitation_message text,
  temporary_access_granted boolean DEFAULT false,
  access_expires_at timestamp with time zone,
  temp_user_id uuid,
  invited_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  notes text,
  CONSTRAINT tryout_invitations_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_invitations_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id) ON DELETE CASCADE,
  CONSTRAINT tryout_invitations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.tryout_applications(id) ON DELETE CASCADE,
  CONSTRAINT tryout_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id),
  CONSTRAINT tryout_invitations_temp_user_id_fkey FOREIGN KEY (temp_user_id) REFERENCES public.users(id)
);

-- Evaluation sessions for invited candidates
CREATE TABLE public.tryout_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  invitation_id uuid NOT NULL,
  session_id uuid,
  session_type text NOT NULL CHECK (session_type = ANY (ARRAY['scrim'::text, 'tournament'::text, 'practice'::text, 'meeting'::text, 'custom'::text])),
  session_title text NOT NULL,
  session_description text,
  scheduled_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  evaluation_goals text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])),
  attendance_status text CHECK (attendance_status = ANY (ARRAY['present'::text, 'late'::text, 'absent'::text, 'excused'::text])),
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tryout_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_sessions_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id) ON DELETE CASCADE,
  CONSTRAINT tryout_sessions_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.tryout_invitations(id) ON DELETE CASCADE,
  CONSTRAINT tryout_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT tryout_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Performance evaluations for candidates
CREATE TABLE public.tryout_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  invitation_id uuid NOT NULL,
  session_id uuid,
  evaluator_id uuid NOT NULL,
  
  -- Performance metrics
  kills integer DEFAULT 0,
  assists integer DEFAULT 0,
  damage double precision DEFAULT 0,
  survival_time double precision DEFAULT 0,
  placement integer,
  
  -- Subjective evaluation scores (1-10)
  game_sense_score integer CHECK (game_sense_score >= 1 AND game_sense_score <= 10),
  utility_score integer CHECK (utility_score >= 1 AND utility_score <= 10),
  rotations_score integer CHECK (rotations_score >= 1 AND rotations_score <= 10),
  communication_score integer CHECK (communication_score >= 1 AND communication_score <= 10),
  
  -- Overall assessment
  overall_score double precision,
  evaluation_notes text,
  strengths text,
  areas_for_improvement text,
  recommendation text CHECK (recommendation = ANY (ARRAY['strong_select'::text, 'select'::text, 'maybe'::text, 'reject'::text, 'strong_reject'::text])),
  
  -- Metadata
  evaluation_date date DEFAULT CURRENT_DATE,
  is_final boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT tryout_evaluations_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_evaluations_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id) ON DELETE CASCADE,
  CONSTRAINT tryout_evaluations_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.tryout_invitations(id) ON DELETE CASCADE,
  CONSTRAINT tryout_evaluations_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.tryout_sessions(id),
  CONSTRAINT tryout_evaluations_evaluator_id_fkey FOREIGN KEY (evaluator_id) REFERENCES public.users(id)
);

-- Final selections and team assignments
CREATE TABLE public.tryout_selections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tryout_id uuid NOT NULL,
  invitation_id uuid NOT NULL,
  application_id uuid NOT NULL,
  selected_by uuid NOT NULL,
  selection_status text NOT NULL CHECK (selection_status = ANY (ARRAY['selected'::text, 'rejected'::text, 'extended'::text, 'pending'::text])),
  
  -- Team assignment details
  assigned_team_id uuid,
  assigned_role text,
  player_type text CHECK (player_type = ANY (ARRAY['main'::text, 'sub'::text, 'support'::text])),
  
  -- Rejection details
  rejection_reason text,
  feedback_message text,
  
  -- New team creation
  new_team_name text,
  new_team_tier text,
  
  -- Metadata
  selection_date date DEFAULT CURRENT_DATE,
  notification_sent boolean DEFAULT false,
  discord_notified boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT tryout_selections_pkey PRIMARY KEY (id),
  CONSTRAINT tryout_selections_tryout_id_fkey FOREIGN KEY (tryout_id) REFERENCES public.tryouts(id) ON DELETE CASCADE,
  CONSTRAINT tryout_selections_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.tryout_invitations(id) ON DELETE CASCADE,
  CONSTRAINT tryout_selections_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.tryout_applications(id) ON DELETE CASCADE,
  CONSTRAINT tryout_selections_selected_by_fkey FOREIGN KEY (selected_by) REFERENCES public.users(id),
  CONSTRAINT tryout_selections_assigned_team_id_fkey FOREIGN KEY (assigned_team_id) REFERENCES public.teams(id)
);

-- ====================================================================
-- 2. CREATE INDEXES
-- ====================================================================

CREATE INDEX idx_tryouts_status ON public.tryouts(status);
CREATE INDEX idx_tryouts_created_by ON public.tryouts(created_by);
CREATE INDEX idx_tryout_applications_tryout_id ON public.tryout_applications(tryout_id);
CREATE INDEX idx_tryout_applications_status ON public.tryout_applications(status);
CREATE INDEX idx_tryout_invitations_tryout_id ON public.tryout_invitations(tryout_id);
CREATE INDEX idx_tryout_invitations_status ON public.tryout_invitations(status);
CREATE INDEX idx_tryout_sessions_tryout_id ON public.tryout_sessions(tryout_id);
CREATE INDEX idx_tryout_evaluations_tryout_id ON public.tryout_evaluations(tryout_id);
CREATE INDEX idx_tryout_selections_tryout_id ON public.tryout_selections(tryout_id);

-- ====================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ====================================================================

ALTER TABLE public.tryouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryout_selections ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 4. CREATE RLS POLICIES
-- ====================================================================

-- Tryouts policies
CREATE POLICY "Staff can manage all tryouts" ON public.tryouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'coach')
    )
  );

CREATE POLICY "Public can view active tryouts" ON public.tryouts
  FOR SELECT USING (status = 'active' AND open_to_public = true);

-- Applications policies
CREATE POLICY "Anyone can create applications" ON public.tryout_applications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tryouts 
      WHERE id = tryout_id 
      AND status = 'active' 
      AND (application_deadline IS NULL OR application_deadline > now())
    )
  );

CREATE POLICY "Staff can manage applications" ON public.tryout_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'coach', 'analyst')
    )
  );

-- Invitations policies
CREATE POLICY "Staff can manage invitations" ON public.tryout_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'coach')
    )
  );

-- Sessions policies
CREATE POLICY "Staff can manage sessions" ON public.tryout_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'coach')
    )
  );

-- Evaluations policies
CREATE POLICY "Evaluators can manage evaluations" ON public.tryout_evaluations
  FOR ALL USING (
    evaluator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Selections policies
CREATE POLICY "Staff can manage selections" ON public.tryout_selections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'coach')
    )
  );

-- ====================================================================
-- 5. INSERT TEST DATA (FIXED VERSION)
-- ====================================================================

DO $$
DECLARE
    admin_user_id uuid;
    team_id_1 uuid;
    team_id_2 uuid;
    tryout_id_1 uuid;
    tryout_id_2 uuid;
    app_id_1 uuid;
    app_id_2 uuid;
    app_id_3 uuid;
    invitation_id uuid;
BEGIN
    -- Get first admin user (with LIMIT 1 to avoid multiple rows error)
    SELECT id INTO admin_user_id 
    FROM public.users 
    WHERE role IN ('admin', 'manager', 'coach')
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- If no admin user exists, skip test data
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'No admin/manager/coach user found. Skipping test data insertion.';
        RETURN;
    END IF;
    
    -- Get existing teams (with LIMIT 1 to avoid multiple rows error)
    SELECT id INTO team_id_1 FROM public.teams ORDER BY created_at ASC LIMIT 1;
    SELECT id INTO team_id_2 FROM public.teams ORDER BY created_at DESC LIMIT 1;
    
    -- If no teams exist, create sample teams
    IF team_id_1 IS NULL THEN
        INSERT INTO public.teams (name, tier, status, coach_id) 
        VALUES ('Raptors Main', 'T1', 'active', admin_user_id)
        RETURNING id INTO team_id_1;
        
        INSERT INTO public.teams (name, tier, status, coach_id) 
        VALUES ('Raptors Jr', 'T2', 'active', admin_user_id)
        RETURNING id INTO team_id_2;
    END IF;
    
    -- Ensure we have two different teams
    IF team_id_2 IS NULL OR team_id_2 = team_id_1 THEN
        INSERT INTO public.teams (name, tier, status, coach_id) 
        VALUES ('Raptors Academy', 'T3', 'active', admin_user_id)
        RETURNING id INTO team_id_2;
    END IF;
    
    -- Insert sample tryouts
    INSERT INTO public.tryouts (
        name, 
        description, 
        purpose, 
        target_roles, 
        team_ids, 
        type, 
        status, 
        open_to_public, 
        application_deadline, 
        evaluation_method, 
        requirements,
        created_by,
        launched_at
    ) VALUES 
    (
        'Raptors Main - July 2025',
        'Looking for skilled players to join our main roster for the upcoming season. We need dedicated players with competitive experience.',
        'existing_team',
        ARRAY['Entry Fragger', 'IGL', 'Support'],
        ARRAY[team_id_1],
        'scrim',
        'active',
        true,
        now() + interval '30 days',
        'mixed',
        'Minimum 2 years competitive experience required. Must be available for evening practice sessions.',
        admin_user_id,
        now() - interval '2 days'
    )
    RETURNING id INTO tryout_id_1;
    
    INSERT INTO public.tryouts (
        name, 
        description, 
        purpose, 
        target_roles, 
        team_ids, 
        type, 
        status, 
        open_to_public, 
        application_deadline, 
        evaluation_method, 
        requirements,
        created_by
    ) VALUES 
    (
        'Raptors Jr - New Team Formation',
        'Building a brand new junior team for upcoming tournaments. Perfect opportunity for rising talent!',
        'new_team',
        ARRAY['Entry Fragger', 'Support', 'Sniper'],
        ARRAY[]::uuid[],
        'practice',
        'draft',
        true,
        now() + interval '45 days',
        'manual',
        'Open to all skill levels. Focus on teamwork and communication.',
        admin_user_id
    )
    RETURNING id INTO tryout_id_2;
    
    -- Insert sample applications
    INSERT INTO public.tryout_applications (
        tryout_id,
        full_name,
        ign,
        discord_tag,
        role_applied_for,
        game_id,
        availability,
        contact_email,
        contact_phone,
        additional_notes,
        status,
        created_at
    ) VALUES 
    (
        tryout_id_1,
        'Alex Johnson',
        'AlexGamer2024',
        'alexj#1234',
        'Entry Fragger',
        'ALEX123456',
        ARRAY['Evening', 'Night'],
        'alex.johnson@email.com',
        '+1234567890',
        'I have 3 years of competitive PUBG Mobile experience and have been IGL for my previous team. Looking to join a serious competitive team.',
        'applied',
        now() - interval '1 day'
    )
    RETURNING id INTO app_id_1;
    
    INSERT INTO public.tryout_applications (
        tryout_id,
        full_name,
        ign,
        discord_tag,
        role_applied_for,
        game_id,
        availability,
        contact_email,
        contact_phone,
        additional_notes,
        status,
        created_at
    ) VALUES 
    (
        tryout_id_1,
        'Sarah Chen',
        'SarahSniper',
        'sarahc#5678',
        'Support',
        'SARAH789012',
        ARRAY['Evening'],
        'sarah.chen@email.com',
        '+1987654321',
        'Professional player with tournament experience. Specialized in support role and team coordination.',
        'shortlisted',
        now() - interval '2 days'
    )
    RETURNING id INTO app_id_2;
    
    INSERT INTO public.tryout_applications (
        tryout_id,
        full_name,
        ign,
        discord_tag,
        role_applied_for,
        game_id,
        availability,
        contact_email,
        contact_phone,
        additional_notes,
        status,
        created_at
    ) VALUES 
    (
        tryout_id_1,
        'Mike Rodriguez',
        'MikeR_Pro',
        'miker#9999',
        'IGL',
        'MIKE345678',
        ARRAY['Evening', 'Night'],
        'mike.rodriguez@email.com',
        '+1122334455',
        'Former team captain with extensive IGL experience. Strong communication skills and strategic thinking.',
        'screened',
        now() - interval '3 days'
    )
    RETURNING id INTO app_id_3;
    
    -- Insert sample invitation for shortlisted candidate
    INSERT INTO public.tryout_invitations (
        tryout_id,
        application_id,
        invited_by,
        status,
        invitation_message,
        temporary_access_granted,
        access_expires_at,
        invited_at
    ) VALUES (
        tryout_id_1,
        app_id_2,
        admin_user_id,
        'invited',
        'Congratulations! You have been shortlisted for our tryout sessions. Please join us for evaluation scrims.',
        true,
        now() + interval '7 days',
        now() - interval '1 day'
    )
    RETURNING id INTO invitation_id;
    
    -- Insert sample evaluation session
    INSERT INTO public.tryout_sessions (
        tryout_id,
        invitation_id,
        session_type,
        session_title,
        session_description,
        scheduled_date,
        start_time,
        end_time,
        evaluation_goals,
        status,
        created_by
    ) VALUES (
        tryout_id_1,
        invitation_id,
        'scrim',
        'Main Roster Evaluation Scrim #1',
        'First evaluation session to assess gameplay and teamwork skills',
        CURRENT_DATE + interval '2 days',
        '19:00:00',
        '21:00:00',
        'Evaluate positioning, communication, and game sense during competitive matches',
        'scheduled',
        admin_user_id
    );
    
    RAISE NOTICE 'Test data inserted successfully!';
    RAISE NOTICE 'Admin User ID: %', admin_user_id;
    RAISE NOTICE 'Team IDs: %, %', team_id_1, team_id_2;
    RAISE NOTICE 'Tryout IDs: %, %', tryout_id_1, tryout_id_2;
    RAISE NOTICE 'Application IDs: %, %, %', app_id_1, app_id_2, app_id_3;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting test data: %', SQLERRM;
        -- Continue execution even if test data fails
END $$;

-- ====================================================================
-- 6. CREATE HELPFUL VIEWS
-- ====================================================================

-- View for tryout statistics
CREATE OR REPLACE VIEW public.tryout_stats AS
SELECT 
    t.id,
    t.name,
    t.status,
    COUNT(ta.id) as total_applications,
    COUNT(CASE WHEN ta.status = 'applied' THEN 1 END) as pending_applications,
    COUNT(CASE WHEN ta.status = 'shortlisted' THEN 1 END) as shortlisted_applications,
    COUNT(ti.id) as total_invitations,
    COUNT(ts.id) as total_sessions,
    COUNT(te.id) as total_evaluations,
    COUNT(tsel.id) as total_selections
FROM public.tryouts t
LEFT JOIN public.tryout_applications ta ON t.id = ta.tryout_id
LEFT JOIN public.tryout_invitations ti ON t.id = ti.tryout_id
LEFT JOIN public.tryout_sessions ts ON t.id = ts.tryout_id
LEFT JOIN public.tryout_evaluations te ON t.id = te.tryout_id
LEFT JOIN public.tryout_selections tsel ON t.id = tsel.tryout_id
GROUP BY t.id, t.name, t.status;

-- ====================================================================
-- SETUP COMPLETE! 
-- ====================================================================

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 TRYOUTS MODULE SETUP COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tables created with proper relationships';
    RAISE NOTICE '✅ Indexes added for performance';
    RAISE NOTICE '✅ Row Level Security enabled';
    RAISE NOTICE '✅ Security policies configured';
    RAISE NOTICE '✅ Test data inserted (if admin user exists)';
    RAISE NOTICE '✅ Helper views created';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Ready to use! Visit /dashboard/tryouts';
    RAISE NOTICE '';
END $$;
