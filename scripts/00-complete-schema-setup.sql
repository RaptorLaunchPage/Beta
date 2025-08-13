-- ====================================================================
-- 🦖 COMPLETE RAPTORS ESPORTS DATABASE SCHEMA SETUP
-- ====================================================================
-- This script creates ALL required tables and ensures database consistency
-- Run this first to establish the complete database schema

-- ====================================================================
-- 1. CORE SYSTEM TABLES
-- ====================================================================

-- Admin configuration table
CREATE TABLE IF NOT EXISTS public.admin_config (
  key text NOT NULL,
  value text NOT NULL,
  CONSTRAINT admin_config_pkey PRIMARY KEY (key)
);

-- Module permissions for role-based access
CREATE TABLE IF NOT EXISTS public.module_permissions (
  id integer GENERATED ALWAYS AS IDENTITY,
  role text NOT NULL,
  module text NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  CONSTRAINT module_permissions_pkey PRIMARY KEY (id)
);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  tier text DEFAULT 'T4'::text,
  coach_id uuid,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])),
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);

-- Users table (main profile storage)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  name text,
  role text DEFAULT 'pending_player'::text CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'coach'::text, 'analyst'::text, 'player'::text, 'pending_player'::text, 'tryout'::text])),
  team_id uuid,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  role_level integer DEFAULT 10,
  contact_number text,
  in_game_role text,
  device_info text,
  provider text,
  device_model text,
  ram text,
  fps text,
  storage text,
  status text DEFAULT 'Active'::text CHECK (status = ANY (ARRAY['Active'::text, 'Benched'::text, 'On Leave'::text, 'Discontinued'::text])),
  gyroscope_enabled boolean DEFAULT true,
  instagram_handle text,
  discord_id text,
  bio text,
  favorite_game text,
  gaming_experience text,
  display_name text,
  full_name text,
  experience text,
  preferred_role text,
  favorite_games text,
  onboarding_completed boolean DEFAULT false,
  last_login timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  bgmi_id text,
  bgmi_tier text CHECK (bgmi_tier = ANY (ARRAY['Bronze'::text, 'Silver'::text, 'Gold'::text, 'Platinum'::text, 'Diamond'::text, 'Crown'::text, 'Ace'::text, 'Conqueror'::text])),
  bgmi_points integer DEFAULT 0,
  sensitivity_settings jsonb,
  control_layout text CHECK (control_layout = ANY (ARRAY['2-finger'::text, '3-finger'::text, '4-finger'::text, '5-finger'::text, '6-finger'::text])),
  hud_layout_code text,
  game_stats jsonb,
  achievements jsonb DEFAULT '[]'::jsonb,
  social_links jsonb DEFAULT '{}'::jsonb,
  emergency_contact_name text,
  emergency_contact_number text,
  date_of_birth date,
  address text,
  preferred_language text DEFAULT 'English'::text,
  timezone text DEFAULT 'Asia/Kolkata'::text,
  profile_visibility text DEFAULT 'team'::text CHECK (profile_visibility = ANY (ARRAY['public'::text, 'team'::text, 'private'::text])),
  auto_sync_tryout_data boolean DEFAULT true,
  last_profile_update timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Profiles table (extended user information) 
CREATE TABLE IF NOT EXISTS public.profiles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  username text,
  avatar_url text,
  website text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  bio text,
  full_name text,
  display_name text,
  contact_number text,
  experience text,
  preferred_role text,
  favorite_games text,
  role text DEFAULT 'pending_player'::text,
  onboarding_completed boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- User agreements for role compliance
CREATE TABLE IF NOT EXISTS public.user_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['player'::text, 'coach'::text, 'manager'::text, 'analyst'::text, 'tryout'::text, 'admin'::text, 'pending_player'::text])),
  agreement_version integer NOT NULL,
  accepted_at timestamp with time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  status text NOT NULL DEFAULT 'accepted'::text CHECK (status = ANY (ARRAY['accepted'::text, 'pending'::text, 'declined'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_agreements_pkey PRIMARY KEY (id),
  CONSTRAINT user_agreements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- ====================================================================
-- 2. PERFORMANCE & SLOT MANAGEMENT
-- ====================================================================

-- Slots for tournament management
CREATE TABLE IF NOT EXISTS public.slots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  organizer text NOT NULL,
  time_range text NOT NULL,
  match_count integer NOT NULL,
  date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  number_of_slots integer DEFAULT 1 CHECK (number_of_slots > 0),
  slot_rate integer DEFAULT 0 CHECK (slot_rate >= 0),
  notes text,
  CONSTRAINT slots_pkey PRIMARY KEY (id),
  CONSTRAINT slots_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Performance tracking
CREATE TABLE IF NOT EXISTS public.performances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  player_id uuid,
  match_number integer NOT NULL,
  map text NOT NULL,
  placement integer,
  kills integer DEFAULT 0,
  assists integer DEFAULT 0,
  damage double precision DEFAULT 0,
  survival_time double precision DEFAULT 0,
  added_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  slot uuid,
  CONSTRAINT performances_pkey PRIMARY KEY (id),
  CONSTRAINT performances_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT performances_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id),
  CONSTRAINT performances_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Financial tracking
CREATE TABLE IF NOT EXISTS public.slot_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  team_id uuid NOT NULL,
  rate integer NOT NULL,
  total integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  number_of_slots integer DEFAULT 1 CHECK (number_of_slots > 0),
  CONSTRAINT slot_expenses_pkey PRIMARY KEY (id),
  CONSTRAINT slot_expenses_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE,
  CONSTRAINT slot_expenses_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.winnings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  team_id uuid NOT NULL,
  position integer NOT NULL CHECK (position > 0),
  amount_won integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT winnings_pkey PRIMARY KEY (id),
  CONSTRAINT winnings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE,
  CONSTRAINT winnings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.prize_pools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL,
  total_amount integer NOT NULL,
  breakdown jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT prize_pools_pkey PRIMARY KEY (id),
  CONSTRAINT prize_pools_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.tier_defaults (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tier text NOT NULL UNIQUE,
  default_slot_rate integer NOT NULL CHECK (default_slot_rate > 0),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tier_defaults_pkey PRIMARY KEY (id)
);

-- ====================================================================
-- 3. ATTENDANCE & SESSION MANAGEMENT
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  session_type text NOT NULL CHECK (session_type = ANY (ARRAY['practice'::text, 'tournament'::text, 'meeting'::text])),
  session_subtype text,
  date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  cutoff_time time without time zone,
  title text,
  description text,
  is_mandatory boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT sessions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.attendances (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  team_id uuid NOT NULL,
  date date NOT NULL,
  session_time text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['present'::text, 'late'::text, 'absent'::text, 'auto'::text])),
  marked_by uuid,
  slot_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  session_id uuid,
  source text DEFAULT 'manual'::text CHECK (source = ANY (ARRAY['manual'::text, 'auto'::text, 'system'::text])),
  CONSTRAINT attendances_pkey PRIMARY KEY (id),
  CONSTRAINT attendances_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id),
  CONSTRAINT attendances_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT attendances_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT attendances_marked_by_fkey FOREIGN KEY (marked_by) REFERENCES public.users(id),
  CONSTRAINT attendances_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id)
);

CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  date date NOT NULL,
  name text NOT NULL,
  recurring_day integer CHECK (recurring_day >= 0 AND recurring_day <= 6),
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT holidays_pkey PRIMARY KEY (id),
  CONSTRAINT holidays_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT holidays_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE IF NOT EXISTS public.practice_session_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  session_subtype text NOT NULL CHECK (session_subtype = ANY (ARRAY['Morning'::text, 'Evening'::text, 'Night'::text])),
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  cutoff_time time without time zone DEFAULT '12:00:00'::time without time zone,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT practice_session_config_pkey PRIMARY KEY (id),
  CONSTRAINT practice_session_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT practice_session_config_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- ====================================================================
-- 4. DISCORD & COMMUNICATION
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.discord_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  hook_url text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['team'::text, 'admin'::text, 'global'::text])),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  channel_name text,
  CONSTRAINT discord_webhooks_pkey PRIMARY KEY (id),
  CONSTRAINT discord_webhooks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT discord_webhooks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

CREATE TABLE IF NOT EXISTS public.communication_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  webhook_id uuid,
  message_type text NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text, 'retry'::text])),
  payload jsonb NOT NULL,
  response_code integer,
  response_body text,
  error_message text,
  triggered_by uuid,
  retry_count integer DEFAULT 0,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT communication_logs_pkey PRIMARY KEY (id),
  CONSTRAINT communication_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.discord_webhooks(id),
  CONSTRAINT communication_logs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.users(id),
  CONSTRAINT communication_logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

CREATE TABLE IF NOT EXISTS public.communication_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  setting_key text NOT NULL,
  setting_value boolean NOT NULL DEFAULT false,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communication_settings_pkey PRIMARY KEY (id),
  CONSTRAINT communication_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id),
  CONSTRAINT communication_settings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- ====================================================================
-- 5. TEAM ROSTER MANAGEMENT
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.rosters (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  in_game_role text,
  contact_number text,
  device_info text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT rosters_pkey PRIMARY KEY (id),
  CONSTRAINT rosters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT rosters_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- ====================================================================
-- 6. DISCORD BOT INTEGRATION TABLES
-- ====================================================================

-- Discord servers connected to teams
CREATE TABLE IF NOT EXISTS public.discord_servers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  guild_id text UNIQUE NOT NULL,
  name text,
  owner_id text,
  connected_team_id uuid,
  features jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discord_servers_pkey PRIMARY KEY (id),
  CONSTRAINT discord_servers_connected_team_id_fkey FOREIGN KEY (connected_team_id) REFERENCES public.teams(id)
);

-- Discord users linked to CRM users
CREATE TABLE IF NOT EXISTS public.discord_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  discord_id text UNIQUE NOT NULL,
  user_id uuid,
  guild_id text,
  username text,
  discriminator text,
  avatar text,
  verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discord_users_pkey PRIMARY KEY (id),
  CONSTRAINT discord_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT discord_users_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.discord_servers(guild_id)
);

-- Performance records from Discord bot
CREATE TABLE IF NOT EXISTS public.performance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  discord_id text,
  guild_id text,
  team_id uuid,
  user_id uuid,
  match_id text,
  kills integer DEFAULT 0,
  damage integer DEFAULT 0,
  placement integer,
  survival_time interval,
  assists integer DEFAULT 0,
  map_name text,
  game_mode text,
  source text DEFAULT 'bot',
  metadata jsonb DEFAULT '{}'::jsonb,
  processed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT performance_records_pkey PRIMARY KEY (id),
  CONSTRAINT performance_records_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT performance_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT performance_records_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.discord_servers(guild_id)
);

-- Bot attendance tracking
CREATE TABLE IF NOT EXISTS public.bot_attendance (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  discord_id text NOT NULL,
  guild_id text,
  user_id uuid,
  session_id uuid,
  attendance_type text CHECK (attendance_type = ANY (ARRAY['voice_join'::text, 'voice_leave'::text, 'manual_mark'::text])),
  status text CHECK (status = ANY (ARRAY['present'::text, 'late'::text, 'absent'::text])),
  duration interval,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bot_attendance_pkey PRIMARY KEY (id),
  CONSTRAINT bot_attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT bot_attendance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id),
  CONSTRAINT bot_attendance_guild_id_fkey FOREIGN KEY (guild_id) REFERENCES public.discord_servers(guild_id)
);

-- ====================================================================
-- 7. ADD MISSING FOREIGN KEY CONSTRAINTS
-- ====================================================================

-- Add foreign key for teams.coach_id -> users.id
ALTER TABLE public.teams ADD CONSTRAINT IF NOT EXISTS teams_coach_id_fkey 
FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- ====================================================================
-- 7. CREATE ESSENTIAL INDEXES
-- ====================================================================

-- Users table performance indexes
CREATE INDEX IF NOT EXISTS idx_users_team_id_role ON public.users(team_id, role);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role, status);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Teams table indexes
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON public.teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);

-- Performances table indexes  
CREATE INDEX IF NOT EXISTS idx_performances_team_date ON public.performances(team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_performances_player_match ON public.performances(player_id, match_number);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Sessions table indexes
CREATE INDEX IF NOT EXISTS idx_sessions_team_date ON public.sessions(team_id, date);

-- ====================================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_agreements ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 9. ESSENTIAL RLS POLICIES
-- ====================================================================

-- Users policies
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Teams policies
CREATE POLICY IF NOT EXISTS "All authenticated users can view teams" ON public.teams
  FOR SELECT USING (auth.role() = 'authenticated');

-- Profiles policies
CREATE POLICY IF NOT EXISTS "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = user_id);

-- Performances policies
CREATE POLICY IF NOT EXISTS "Players can view own performances" ON public.performances
  FOR SELECT USING (player_id = auth.uid());

-- User agreements policies
CREATE POLICY IF NOT EXISTS "Users can manage own agreements" ON public.user_agreements
  FOR ALL USING (user_id = auth.uid());

-- ====================================================================
-- 10. INSERT DEFAULT DATA
-- ====================================================================

-- Insert module permissions
INSERT INTO public.module_permissions (role, module, can_access) VALUES
  ('admin', 'dashboard', true),
  ('admin', 'users', true),
  ('admin', 'teams', true),
  ('admin', 'performance', true),
  ('admin', 'attendance', true),
  ('admin', 'slots', true),
  ('admin', 'tryouts', true),
  ('admin', 'settings', true),
  ('manager', 'dashboard', true),
  ('manager', 'teams', true),
  ('manager', 'performance', true),
  ('manager', 'attendance', true),
  ('manager', 'slots', true),
  ('coach', 'dashboard', true),
  ('coach', 'performance', true),
  ('coach', 'attendance', true),
  ('player', 'dashboard', true),
  ('player', 'performance', true),
  ('analyst', 'dashboard', true),
  ('analyst', 'performance', true)
ON CONFLICT DO NOTHING;

-- Insert default tier rates
INSERT INTO public.tier_defaults (tier, default_slot_rate) VALUES
  ('God', 1000),
  ('T1', 800),
  ('T2', 600),
  ('T3', 400),
  ('T4', 200)
ON CONFLICT (tier) DO NOTHING;

-- Insert admin config
INSERT INTO public.admin_config (key, value) VALUES
  ('app_version', '2025.01'),
  ('maintenance_mode', 'false'),
  ('agreement_version_player', '1'),
  ('agreement_version_coach', '1'),
  ('agreement_version_manager', '1')
ON CONFLICT (key) DO NOTHING;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '🎉 COMPLETE DATABASE SCHEMA SETUP SUCCESSFUL!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ All tables created with proper relationships';
    RAISE NOTICE '✅ Indexes added for performance';
    RAISE NOTICE '✅ Row Level Security enabled';
    RAISE NOTICE '✅ Essential policies configured';
    RAISE NOTICE '✅ Default data inserted';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Database is ready for the application!';
END $$;

-- ====================================================================
-- 12. DISCORD BOT INTEGRATION UPDATES
-- ====================================================================

-- Update tryouts table for Discord bot integration (if it exists)
DO $$
BEGIN
    -- Add mode column to tryouts table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tryouts' AND table_schema = 'public') THEN
        -- Add mode column for player/team tryouts
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tryouts' AND column_name = 'mode') THEN
            ALTER TABLE public.tryouts ADD COLUMN mode text DEFAULT 'player' CHECK (mode = ANY (ARRAY['player'::text, 'team'::text]));
        END IF;
        
        -- Add Discord-specific fields
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tryouts' AND column_name = 'guild_id') THEN
            ALTER TABLE public.tryouts ADD COLUMN guild_id text;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tryouts' AND column_name = 'discord_channel_id') THEN
            ALTER TABLE public.tryouts ADD COLUMN discord_channel_id text;
        END IF;
    END IF;
    
    -- Update tryout_applications table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tryout_applications' AND table_schema = 'public') THEN
        -- Add team mode fields
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tryout_applications' AND column_name = 'team_name') THEN
            ALTER TABLE public.tryout_applications ADD COLUMN team_name text;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tryout_applications' AND column_name = 'manager_name') THEN
            ALTER TABLE public.tryout_applications ADD COLUMN manager_name text;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tryout_applications' AND column_name = 'vod_link') THEN
            ALTER TABLE public.tryout_applications ADD COLUMN vod_link text;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tryout_applications' AND column_name = 'discord_id') THEN
            ALTER TABLE public.tryout_applications ADD COLUMN discord_id text;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tryout_applications' AND column_name = 'phase') THEN
            ALTER TABLE public.tryout_applications ADD COLUMN phase text DEFAULT 'applied' CHECK (phase = ANY (ARRAY['applied'::text, 'screened'::text, 'invited'::text, 'evaluated'::text, 'selected'::text, 'rejected'::text]));
        END IF;
    END IF;
    
    RAISE NOTICE '✅ Discord bot integration tables and updates applied';
END $$;

-- Enable RLS on new Discord tables
ALTER TABLE public.discord_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discord_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_attendance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Discord integration
CREATE POLICY "Admins can manage discord servers" ON public.discord_servers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Team members can view their discord server" ON public.discord_servers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND team_id = connected_team_id
    )
  );

CREATE POLICY "Users can manage their own discord account" ON public.discord_users
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all discord users" ON public.discord_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own performance records" ON public.performance_records
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Team staff can view team performance records" ON public.performance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager', 'coach')
      AND (u.role = 'admin' OR u.team_id = performance_records.team_id)
    )
  );

CREATE POLICY "Users can view own bot attendance" ON public.bot_attendance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Team staff can manage team bot attendance" ON public.bot_attendance
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'manager', 'coach')
      AND (u.role = 'admin' OR u.team_id = (SELECT team_id FROM public.users WHERE id = bot_attendance.user_id))
    )
  );

-- Add indexes for Discord integration
CREATE INDEX IF NOT EXISTS idx_discord_servers_guild_id ON public.discord_servers(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_servers_team_id ON public.discord_servers(connected_team_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_discord_id ON public.discord_users(discord_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_user_id ON public.discord_users(user_id);
CREATE INDEX IF NOT EXISTS idx_discord_users_guild_id ON public.discord_users(guild_id);
CREATE INDEX IF NOT EXISTS idx_performance_records_discord_id ON public.performance_records(discord_id);
CREATE INDEX IF NOT EXISTS idx_performance_records_team_id ON public.performance_records(team_id);
CREATE INDEX IF NOT EXISTS idx_performance_records_created_at ON public.performance_records(created_at);
CREATE INDEX IF NOT EXISTS idx_bot_attendance_discord_id ON public.bot_attendance(discord_id);
CREATE INDEX IF NOT EXISTS idx_bot_attendance_session_id ON public.bot_attendance(session_id);

-- Final Discord integration success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🤖 RAPTORBOT INTEGRATION SETUP COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Discord servers table created';
    RAISE NOTICE '✅ Discord users linking table created';
    RAISE NOTICE '✅ Performance records from bot table created';
    RAISE NOTICE '✅ Bot attendance tracking table created';
    RAISE NOTICE '✅ Tryouts table updated for Discord integration';
    RAISE NOTICE '✅ RLS policies configured for bot integration';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Database is ready for RaptorBot integration!';
    RAISE NOTICE 'Set RAPTOR_BOT_API_KEY in your environment variables';
    RAISE NOTICE '';
END $$;