-- ====================================================================
-- 🤖 DISCORD PORTAL AUTOMATION - SCRIPT #3
-- ====================================================================
-- This script creates automation functions for Discord portal
-- Run this after session/attendance automation

-- ====================================================================
-- 1. WEBHOOK MANAGEMENT FUNCTIONS
-- ====================================================================

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

-- ====================================================================
-- 2. MESSAGE LOGGING FUNCTIONS
-- ====================================================================

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

-- ====================================================================
-- 3. AUTOMATION TRIGGER FUNCTIONS
-- ====================================================================

-- Function to trigger slot creation notification
CREATE OR REPLACE FUNCTION public.trigger_slot_creation_notification()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url text;
    webhook_id uuid;
    log_id uuid;
BEGIN
    -- Check if automation is enabled for this team
    IF public.get_team_setting(NEW.team_id, 'auto_slot_create') THEN
        -- Get webhook URL
        webhook_url := public.get_team_webhook(NEW.team_id);
        
        IF webhook_url IS NOT NULL THEN
            -- Get webhook ID for logging
            SELECT id INTO webhook_id
            FROM public.discord_webhooks
            WHERE hook_url = webhook_url
            AND team_id = NEW.team_id
            LIMIT 1;
            
            -- Log the notification attempt
            SELECT public.log_discord_message(
                NEW.team_id,
                webhook_id,
                'slot_create',
                'pending',
                jsonb_build_object(
                    'slot_id', NEW.id,
                    'organizer', NEW.organizer,
                    'date', NEW.date,
                    'time_range', NEW.time_range,
                    'match_count', NEW.match_count
                ),
                NULL,
                NULL,
                NULL,
                NULL
            ) INTO log_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to trigger roster update notification
CREATE OR REPLACE FUNCTION public.trigger_roster_update_notification()
RETURNS TRIGGER AS $$
DECLARE
    webhook_url text;
    webhook_id uuid;
    log_id uuid;
BEGIN
    -- Check if automation is enabled for this team
    IF public.get_team_setting(NEW.team_id, 'auto_roster_update') THEN
        -- Get webhook URL
        webhook_url := public.get_team_webhook(NEW.team_id);
        
        IF webhook_url IS NOT NULL THEN
            -- Get webhook ID for logging
            SELECT id INTO webhook_id
            FROM public.discord_webhooks
            WHERE hook_url = webhook_url
            AND team_id = NEW.team_id
            LIMIT 1;
            
            -- Log the notification attempt
            SELECT public.log_discord_message(
                NEW.team_id,
                webhook_id,
                'roster_update',
                'pending',
                jsonb_build_object(
                    'roster_id', NEW.id,
                    'user_id', NEW.user_id,
                    'in_game_role', NEW.in_game_role
                ),
                NULL,
                NULL,
                NULL,
                NULL
            ) INTO log_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 4. GRANT PERMISSIONS
-- ====================================================================

-- Grant execute permissions on Discord portal functions
GRANT EXECUTE ON FUNCTION public.get_team_webhook(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_setting(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_discord_message(uuid, uuid, text, text, jsonb, integer, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_discord_logs(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_slot_creation_notification() TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_roster_update_notification() TO authenticated;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Discord Portal automation functions created successfully!';
    RAISE NOTICE '🤖 Created % Discord automation functions', 6;
    RAISE NOTICE '🔧 Ready for next automation script!';
END $$;