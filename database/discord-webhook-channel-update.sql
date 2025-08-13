-- =====================================================
-- ADD CHANNEL_NAME TO DISCORD WEBHOOKS
-- Quick update to add channel identification
-- =====================================================

-- Add channel_name column to discord_webhooks table
ALTER TABLE public.discord_webhooks 
ADD COLUMN IF NOT EXISTS channel_name text;

-- Add a comment to describe the purpose
COMMENT ON COLUMN public.discord_webhooks.channel_name IS 'Discord channel name for easy identification (e.g., #general, #performance-updates)';

-- Create index for searching by channel name
CREATE INDEX IF NOT EXISTS idx_discord_webhooks_channel_name ON public.discord_webhooks(channel_name);

-- Update existing webhooks with default channel names based on type
UPDATE public.discord_webhooks 
SET channel_name = CASE 
  WHEN type = 'team' AND channel_name IS NULL THEN '#team-updates'
  WHEN type = 'admin' AND channel_name IS NULL THEN '#admin-alerts'
  WHEN type = 'global' AND channel_name IS NULL THEN '#global-notifications'
  ELSE channel_name
END
WHERE channel_name IS NULL;

-- Verification query
SELECT 
  'discord_webhooks' as table_name,
  'channel_name' as column_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'discord_webhooks' 
      AND column_name = 'channel_name'
    ) THEN '✅ Added Successfully'
    ELSE '❌ Failed to Add'
  END as status;

-- Show updated webhooks
SELECT 
  type,
  channel_name,
  active,
  created_at
FROM public.discord_webhooks
ORDER BY created_at DESC
LIMIT 5;

SELECT 'Discord webhook channel_name column added successfully! 🎉' as result;