-- Profile Enhancement for BGMI-focused CRM
-- Add BGMI-specific fields to users table

-- Add new columns for BGMI player profile
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bgmi_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bgmi_tier TEXT CHECK (bgmi_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Crown', 'Ace', 'Conqueror'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bgmi_points INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sensitivity_settings JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS control_layout TEXT CHECK (control_layout IN ('2-finger', '3-finger', '4-finger', '5-finger', '6-finger'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS hud_layout_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS game_stats JSONB;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'English';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'team' CHECK (profile_visibility IN ('public', 'team', 'private'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auto_sync_tryout_data BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_bgmi_id ON public.users(bgmi_id);
CREATE INDEX IF NOT EXISTS idx_users_bgmi_tier ON public.users(bgmi_tier);
CREATE INDEX IF NOT EXISTS idx_users_profile_visibility ON public.users(profile_visibility);

-- Update the existing users table constraint for role
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'coach'::text, 'analyst'::text, 'player'::text, 'pending_player'::text, 'tryout'::text]));

-- Create a function to auto-sync tryout application data to user profile
CREATE OR REPLACE FUNCTION sync_tryout_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync if user has auto_sync enabled and application is for the same email
    IF EXISTS (
        SELECT 1 FROM public.users 
        WHERE email = NEW.contact_email 
        AND auto_sync_tryout_data = true
    ) THEN
        UPDATE public.users 
        SET 
            full_name = COALESCE(full_name, NEW.full_name),
            display_name = COALESCE(display_name, NEW.ign),
            discord_id = COALESCE(discord_id, NEW.discord_tag),
            bio = COALESCE(bio, NEW.additional_notes),
            preferred_role = COALESCE(preferred_role, NEW.role_applied_for),
            last_profile_update = now()
        WHERE email = NEW.contact_email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tryout application sync
DROP TRIGGER IF EXISTS trigger_sync_tryout_to_profile ON public.tryout_applications;
CREATE TRIGGER trigger_sync_tryout_to_profile
    AFTER INSERT OR UPDATE ON public.tryout_applications
    FOR EACH ROW
    EXECUTE FUNCTION sync_tryout_to_profile();

-- Create profile permission function
CREATE OR REPLACE FUNCTION can_view_profile(viewer_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    viewer_role TEXT;
    target_visibility TEXT;
    same_team BOOLEAN := false;
BEGIN
    -- Get viewer role
    SELECT role INTO viewer_role FROM public.users WHERE id = viewer_user_id;
    
    -- Get target user's profile visibility
    SELECT profile_visibility INTO target_visibility FROM public.users WHERE id = target_user_id;
    
    -- Check if same team
    SELECT EXISTS (
        SELECT 1 FROM public.users u1, public.users u2 
        WHERE u1.id = viewer_user_id 
        AND u2.id = target_user_id 
        AND u1.team_id = u2.team_id 
        AND u1.team_id IS NOT NULL
    ) INTO same_team;
    
    -- Permission logic
    RETURN (
        viewer_user_id = target_user_id OR -- Own profile
        viewer_role IN ('admin', 'manager') OR -- Admin/Manager can see all
        (viewer_role = 'coach' AND same_team) OR -- Coach can see team members
        target_visibility = 'public' OR -- Public profiles
        (target_visibility = 'team' AND same_team) -- Team visibility for team members
    );
END;
$$ LANGUAGE plpgsql;

-- Create profile edit permission function
CREATE OR REPLACE FUNCTION can_edit_profile(editor_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    editor_role TEXT;
    same_team BOOLEAN := false;
BEGIN
    -- Get editor role
    SELECT role INTO editor_role FROM public.users WHERE id = editor_user_id;
    
    -- Check if same team
    SELECT EXISTS (
        SELECT 1 FROM public.users u1, public.users u2 
        WHERE u1.id = editor_user_id 
        AND u2.id = target_user_id 
        AND u1.team_id = u2.team_id 
        AND u1.team_id IS NOT NULL
    ) INTO same_team;
    
    -- Permission logic
    RETURN (
        editor_user_id = target_user_id OR -- Own profile
        editor_role IN ('admin', 'manager') OR -- Admin/Manager can edit all
        (editor_role = 'coach' AND same_team) -- Coach can edit team members
    );
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN public.users.bgmi_id IS 'Player BGMI ID for identification';
COMMENT ON COLUMN public.users.bgmi_tier IS 'Current BGMI rank/tier';
COMMENT ON COLUMN public.users.bgmi_points IS 'Current BGMI points';
COMMENT ON COLUMN public.users.sensitivity_settings IS 'JSON object containing sensitivity settings for different scopes';
COMMENT ON COLUMN public.users.control_layout IS 'Number of fingers used for controls';
COMMENT ON COLUMN public.users.hud_layout_code IS 'BGMI HUD layout sharing code';
COMMENT ON COLUMN public.users.game_stats IS 'JSON object containing game statistics';
COMMENT ON COLUMN public.users.achievements IS 'Array of achievements and certifications';
COMMENT ON COLUMN public.users.social_links IS 'JSON object containing social media links';
COMMENT ON COLUMN public.users.profile_visibility IS 'Who can view this profile (public/team/private)';
COMMENT ON COLUMN public.users.auto_sync_tryout_data IS 'Whether to automatically sync data from tryout applications';

-- Insert default module permissions for profile management
INSERT INTO public.module_permissions (role, module, can_access) VALUES
('admin', 'profile_view_all', true),
('admin', 'profile_edit_all', true),
('manager', 'profile_view_all', true),
('manager', 'profile_edit_all', true),
('coach', 'profile_view_team', true),
('coach', 'profile_edit_team', true),
('analyst', 'profile_view_team', true),
('analyst', 'profile_edit_own', true),
('player', 'profile_view_own', true),
('player', 'profile_edit_own', true),
('pending_player', 'profile_view_own', true),
('pending_player', 'profile_edit_own', true),
('tryout', 'profile_view_own', true),
('tryout', 'profile_edit_own', true)
ON CONFLICT (role, module) DO NOTHING;
