-- =====================================================
-- COMPLETE DISCORD PORTAL DATABASE SETUP
-- All tables, functions, triggers, and RLS policies
-- =====================================================

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Table: discord_webhooks
-- Stores Discord webhook URLs for teams and system-wide notifications
CREATE TABLE IF NOT EXISTS public.discord_webhooks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid, -- NULL for admin/global webhooks
  hook_url text NOT NULL,
  channel_name text NOT NULL, -- Discord channel name for identification
  type text NOT NULL CHECK (type = ANY (ARRAY['team'::text, 'admin'::text, 'global'::text])),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  CONSTRAINT discord_webhooks_pkey PRIMARY KEY (id),
  CONSTRAINT discord_webhooks_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT discord_webhooks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Table: communication_logs
-- Logs all Discord message attempts for debugging and audit purposes
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid, -- NULL for global/admin messages
  webhook_id uuid,
  message_type text NOT NULL, -- 'slot_create', 'roster_update', 'performance_summary', etc.
  status text NOT NULL CHECK (status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text, 'retry'::text])),
  payload jsonb NOT NULL, -- The complete embed payload sent to Discord
  response_code integer, -- HTTP response code from Discord
  response_body text, -- Discord API response
  error_message text, -- Error details if failed
  triggered_by uuid, -- User who triggered the message (NULL for auto)
  retry_count integer DEFAULT 0,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT communication_logs_pkey PRIMARY KEY (id),
  CONSTRAINT communication_logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL,
  CONSTRAINT communication_logs_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.discord_webhooks(id) ON DELETE SET NULL,
  CONSTRAINT communication_logs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Table: communication_settings
-- Discord automation toggle settings per team and global
CREATE TABLE IF NOT EXISTS public.communication_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid, -- NULL for global settings
  setting_key text NOT NULL, -- 'auto_slot_create', 'auto_roster_update', etc.
  setting_value boolean NOT NULL DEFAULT false,
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT communication_settings_pkey PRIMARY KEY (id),
  CONSTRAINT communication_settings_team_setting_key_unique UNIQUE (team_id, setting_key),
  CONSTRAINT communication_settings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
  CONSTRAINT communication_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_discord_webhooks_team_id ON public.discord_webhooks(team_id);
CREATE INDEX IF NOT EXISTS idx_discord_webhooks_type ON public.discord_webhooks(type);
CREATE INDEX IF NOT EXISTS idx_discord_webhooks_active ON public.discord_webhooks(active);
CREATE INDEX IF NOT EXISTS idx_discord_webhooks_channel_name ON public.discord_webhooks(channel_name);

CREATE INDEX IF NOT EXISTS idx_communication_logs_team_id ON public.communication_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_communication_logs_message_type ON public.communication_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_communication_logs_status ON public.communication_logs(status);
CREATE INDEX IF NOT EXISTS idx_communication_logs_timestamp ON public.communication_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_communication_logs_webhook_id ON public.communication_logs(webhook_id);

CREATE INDEX IF NOT EXISTS idx_communication_settings_team_id ON public.communication_settings(team_id);
CREATE INDEX IF NOT EXISTS idx_communication_settings_key ON public.communication_settings(setting_key);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discord_webhooks
DROP POLICY IF EXISTS "Team members can view team webhooks" ON public.discord_webhooks;
CREATE POLICY "Team members can view team webhooks" ON public.discord_webhooks
  FOR SELECT USING (
    team_id IS NULL OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'manager') OR team_id = discord_webhooks.team_id)
    )
  );

DROP POLICY IF EXISTS "Admins can manage all webhooks" ON public.discord_webhooks;
CREATE POLICY "Admins can manage all webhooks" ON public.discord_webhooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Coaches can manage team webhooks" ON public.discord_webhooks;
CREATE POLICY "Coaches can manage team webhooks" ON public.discord_webhooks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (
        role IN ('admin', 'manager', 'coach') 
        AND (team_id = discord_webhooks.team_id OR discord_webhooks.team_id IS NULL)
      )
    )
  );

-- RLS Policies for communication_logs
DROP POLICY IF EXISTS "Team members can view team logs" ON public.communication_logs;
CREATE POLICY "Team members can view team logs" ON public.communication_logs
  FOR SELECT USING (
    team_id IS NULL OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'manager') OR team_id = communication_logs.team_id)
    )
  );

DROP POLICY IF EXISTS "Admins can view all logs" ON public.communication_logs;
CREATE POLICY "Admins can view all logs" ON public.communication_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "System can insert logs" ON public.communication_logs;
CREATE POLICY "System can insert logs" ON public.communication_logs
  FOR INSERT WITH CHECK (true); -- Allow system inserts from API

-- RLS Policies for communication_settings
DROP POLICY IF EXISTS "Team members can view team settings" ON public.communication_settings;
CREATE POLICY "Team members can view team settings" ON public.communication_settings
  FOR SELECT USING (
    team_id IS NULL OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND (role IN ('admin', 'manager') OR team_id = communication_settings.team_id)
    )
  );

DROP POLICY IF EXISTS "Admins can manage all settings" ON public.communication_settings;
CREATE POLICY "Admins can manage all settings" ON public.communication_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Coaches can manage team settings" ON public.communication_settings;
CREATE POLICY "Coaches can manage team settings" ON public.communication_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'coach')
      AND (team_id = communication_settings.team_id OR communication_settings.team_id IS NULL)
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get active webhook for a team
CREATE OR REPLACE FUNCTION public.get_team_webhook(team_id_param uuid)
RETURNS text AS $$
DECLARE
    webhook_url text;
BEGIN
    SELECT hook_url INTO webhook_url
    FROM public.discord_webhooks
    WHERE team_id = team_id_param
    AND type = 'team'
    AND active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no team webhook, try global webhook
    IF webhook_url IS NULL THEN
        SELECT hook_url INTO webhook_url
        FROM public.discord_webhooks
        WHERE team_id IS NULL
        AND type = 'global'
        AND active = true
        ORDER BY created_at DESC
        LIMIT 1;
    END IF;
    
    RETURN webhook_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log Discord message attempts
CREATE OR REPLACE FUNCTION public.log_discord_message(
    p_team_id uuid,
    p_webhook_id uuid,
    p_message_type text,
    p_status text,
    p_payload jsonb,
    p_response_code integer DEFAULT NULL,
    p_response_body text DEFAULT NULL,
    p_error_message text DEFAULT NULL,
    p_triggered_by uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.communication_logs (
        team_id,
        webhook_id,
        message_type,
        status,
        payload,
        response_code,
        response_body,
        error_message,
        triggered_by
    ) VALUES (
        p_team_id,
        p_webhook_id,
        p_message_type,
        p_status,
        p_payload,
        p_response_code,
        p_response_body,
        p_error_message,
        p_triggered_by
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get team setting value
CREATE OR REPLACE FUNCTION public.get_team_setting(
    p_team_id uuid,
    p_setting_key text
)
RETURNS boolean AS $$
DECLARE
    setting_value boolean;
BEGIN
    SELECT cs.setting_value INTO setting_value
    FROM public.communication_settings cs
    WHERE cs.team_id = p_team_id
    AND cs.setting_key = p_setting_key;
    
    -- If no team-specific setting, try global setting
    IF setting_value IS NULL THEN
        SELECT cs.setting_value INTO setting_value
        FROM public.communication_settings cs
        WHERE cs.team_id IS NULL
        AND cs.setting_key = p_setting_key;
    END IF;
    
    RETURN COALESCE(setting_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old logs (for maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_discord_logs(days_to_keep integer DEFAULT 30)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.communication_logs
    WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DEFAULT SETTINGS SETUP
-- =====================================================

-- Insert default automation settings for existing teams
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get an admin user for the updated_by field
    SELECT id INTO admin_user_id FROM public.users WHERE role = 'admin' LIMIT 1;
    
    -- If no admin found, use the first user
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM public.users LIMIT 1;
    END IF;
    
    -- Only proceed if we have a user
    IF admin_user_id IS NOT NULL THEN
        -- Insert team-specific settings for all existing teams
        INSERT INTO public.communication_settings (team_id, setting_key, setting_value, updated_by)
        SELECT 
          t.id as team_id,
          setting_key,
          false as setting_value,
          admin_user_id as updated_by
        FROM public.teams t
        CROSS JOIN (
          VALUES 
            ('auto_slot_create'),
            ('auto_roster_update'),
            ('auto_daily_summary'),
            ('auto_weekly_digest'),
            ('auto_performance_alerts'),
            ('auto_attendance_alerts'),
            ('auto_finance_updates'),
            ('auto_tournament_notifications')
        ) AS settings(setting_key)
        ON CONFLICT (team_id, setting_key) DO NOTHING;

        -- Insert global default settings
        INSERT INTO public.communication_settings (team_id, setting_key, setting_value, updated_by)
        SELECT 
          NULL as team_id,
          setting_key,
          false as setting_value,
          admin_user_id as updated_by
        FROM (
          VALUES 
            ('auto_data_cleanup'),
            ('auto_system_alerts'),
            ('auto_admin_notifications'),
            ('auto_backup_notifications'),
            ('auto_security_alerts')
        ) AS global_settings(setting_key)
        ON CONFLICT (team_id, setting_key) DO NOTHING;
    END IF;
END;
$$;

-- =====================================================
-- MESSAGE TYPE DEFINITIONS (for reference)
-- =====================================================

-- Common message types used in the system:
-- 'slot_create' - When a new tournament slot is created
-- 'roster_update' - When team roster changes
-- 'performance_summary' - Daily/weekly performance summaries
-- 'attendance_summary' - Attendance reports
-- 'finance_update' - Expense/earning notifications
-- 'tournament_notification' - Tournament-related updates
-- 'system_alert' - System maintenance or issues
-- 'user_management' - User role changes
-- 'team_announcement' - General team announcements

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discord_webhooks TO authenticated;
GRANT SELECT, INSERT ON public.communication_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.communication_settings TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.get_team_webhook(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_discord_message(uuid, uuid, text, text, jsonb, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_setting(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_discord_logs(integer) TO authenticated;

-- =====================================================
-- FINAL VERIFICATION
-- =====================================================

-- Verify tables exist
SELECT 
    'discord_webhooks' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discord_webhooks') 
         THEN '✅ Created' 
         ELSE '❌ Missing' 
    END as status
UNION ALL
SELECT 
    'communication_logs' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communication_logs') 
         THEN '✅ Created' 
         ELSE '❌ Missing' 
    END as status
UNION ALL
SELECT 
    'communication_settings' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communication_settings') 
         THEN '✅ Created' 
         ELSE '❌ Missing' 
    END as status;

-- Show default settings count
SELECT 
    CASE 
        WHEN team_id IS NULL THEN 'Global Settings'
        ELSE 'Team Settings'
    END as setting_type,
    COUNT(*) as setting_count
FROM public.communication_settings
GROUP BY team_id IS NULL;

-- Discord Portal Database Setup Complete!
SELECT 'Discord Portal database setup completed successfully! 🎉' as status;