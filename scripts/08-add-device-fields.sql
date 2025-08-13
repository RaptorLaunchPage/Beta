-- Add device fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_model TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ram TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fps TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS storage TEXT;
-- Add profile_picture column if needed (though avatar_url is already used)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;