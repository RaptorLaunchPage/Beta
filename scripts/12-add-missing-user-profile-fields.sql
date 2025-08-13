-- Add missing fields to users table for onboarding and profile functionality
-- This script adds all fields that the UI components expect but are missing from the database

-- Add missing user profile fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS favorite_game TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gaming_experience TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_role TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS favorite_games TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create trigger to automatically update updated_at field
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update profiles table to include missing fields that the UI expects
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_games TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'pending_player';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create indexes for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_users_display_name ON public.users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON public.users(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON public.users(updated_at);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed ON public.profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Grant necessary permissions for the new fields
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Create a function to sync user data between users and profiles tables if needed
CREATE OR REPLACE FUNCTION public.sync_user_profile_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert corresponding profile record when user is updated
    INSERT INTO public.profiles (
        user_id, 
        full_name, 
        display_name, 
        bio, 
        contact_number, 
        experience, 
        preferred_role, 
        favorite_games,
        role,
        onboarding_completed,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.full_name,
        NEW.display_name,
        NEW.bio,
        NEW.contact_number,
        NEW.experience,
        NEW.preferred_role,
        NEW.favorite_games,
        NEW.role,
        NEW.onboarding_completed,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        full_name = NEW.full_name,
        display_name = NEW.display_name,
        bio = NEW.bio,
        contact_number = NEW.contact_number,
        experience = NEW.experience,
        preferred_role = NEW.preferred_role,
        favorite_games = NEW.favorite_games,
        role = NEW.role,
        onboarding_completed = NEW.onboarding_completed,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync data between users and profiles
DROP TRIGGER IF EXISTS sync_user_profile_on_update ON public.users;
CREATE TRIGGER sync_user_profile_on_update
    AFTER INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_profile_data();

-- Update the users table type constraints to include new roles if needed
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'manager', 'coach', 'player', 'analyst', 'pending_player', 'awaiting_approval'));

-- Add some helpful comments
COMMENT ON COLUMN public.users.bio IS 'User biography/personal description';
COMMENT ON COLUMN public.users.favorite_game IS 'User favorite game';
COMMENT ON COLUMN public.users.gaming_experience IS 'User gaming background and experience';
COMMENT ON COLUMN public.users.display_name IS 'Public display name for the user';
COMMENT ON COLUMN public.users.full_name IS 'User full real name';
COMMENT ON COLUMN public.users.experience IS 'General experience level';
COMMENT ON COLUMN public.users.preferred_role IS 'Preferred in-game role';
COMMENT ON COLUMN public.users.favorite_games IS 'List of favorite games';
COMMENT ON COLUMN public.users.onboarding_completed IS 'Whether user has completed onboarding process';
COMMENT ON COLUMN public.users.last_login IS 'Timestamp of user last login';
COMMENT ON COLUMN public.users.updated_at IS 'Timestamp when user record was last updated';