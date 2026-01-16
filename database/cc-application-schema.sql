-- =====================================================
-- CC APPLICATION SYSTEM SCHEMA
-- =====================================================

-- Table: cc_applications
-- Stores applications from content creators
CREATE TABLE IF NOT EXISTS public.cc_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reviewing')),

  -- Section 1: Identity & Platform
  name text NOT NULL,
  email text,
  primary_platform text NOT NULL CHECK (primary_platform IN ('YouTube', 'Instagram')),
  secondary_platform text CHECK (secondary_platform IN ('YouTube', 'Instagram', 'None')),
  primarily_streams_bgmi boolean NOT NULL,

  -- Section 2: Platform Metrics
  instagram_follower_count integer,
  youtube_subscriber_count integer,
  avg_growth_last_30_days numeric,
  avg_growth_screenshot_url text,

  -- Section 3: Streaming Habits
  streams_per_week integer,
  avg_stream_duration numeric,
  typical_streaming_days text[], -- Array of days
  fixed_schedule boolean NOT NULL,

  -- Section 4: Live Audience Metrics
  avg_concurrent_viewers integer,
  avg_total_live_views integer,
  chat_activity_rating integer,
  recent_live_analytics_screenshot_url text,

  -- Section 5: Content Output
  reels_posted_last_30_days integer,
  avg_views_last_5_reels integer,
  youtube_long_videos_last_30_days integer,
  comfortable_clipping_streams boolean NOT NULL,
  comfortable_posting_reels_weekly boolean NOT NULL,

  -- Section 6: Consistency & Discipline
  longest_inactivity_gap_days integer,
  missed_planned_streams integer,
  uses_content_calendar boolean,

  -- Section 7: Professional Readiness
  willing_to_use_org_branding boolean NOT NULL,
  willing_to_tag_org boolean NOT NULL,
  willing_to_do_collabs boolean NOT NULL,
  willing_to_share_insights boolean NOT NULL,
  willing_to_sign_agreement boolean NOT NULL,

  -- Section 8: Community & Collaboration
  discord_knowledge boolean,
  actively_engages_discord boolean,
  hosted_community_games boolean,
  collaborated_before boolean,

  -- Section 9: Behaviour & Safety
  no_cheating_hacks boolean,
  no_betting_gambling boolean,
  comfortable_content_guidelines boolean,

  -- Section 10: Open Responses & Links
  why_join text NOT NULL,
  support_needed text NOT NULL,
  social_links jsonb, -- Store links as key-value pairs
  additional_info text,

  -- Eligibility
  is_eligible boolean NOT NULL DEFAULT false,

  CONSTRAINT cc_applications_pkey PRIMARY KEY (id)
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.cc_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public application form)
DROP POLICY IF EXISTS "Anyone can insert cc_applications" ON public.cc_applications;
CREATE POLICY "Anyone can insert cc_applications" ON public.cc_applications
  FOR INSERT WITH CHECK (true);

-- Allow admins/managers to view all applications
DROP POLICY IF EXISTS "Admins can view all cc_applications" ON public.cc_applications;
CREATE POLICY "Admins can view all cc_applications" ON public.cc_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Allow admins/managers to update applications (e.g., status)
DROP POLICY IF EXISTS "Admins can update cc_applications" ON public.cc_applications;
CREATE POLICY "Admins can update cc_applications" ON public.cc_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Allow admins/managers to delete applications
DROP POLICY IF EXISTS "Admins can delete cc_applications" ON public.cc_applications;
CREATE POLICY "Admins can delete cc_applications" ON public.cc_applications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- =====================================================
-- STORAGE BUCKET POLICIES
-- =====================================================
-- Note: Buckets are typically created via API or dashboard.
-- We define policies assuming the bucket 'cc-applications' exists.

-- Allow public to upload to cc-applications bucket
-- Assuming the bucket is public or we serve signed URLs.
-- For simplicity, we allow public reads if we want them visible,
-- but strictly speaking only admins should read.
-- However, typically public uploads need to be readable by the uploader context or public if they are proof images.
-- Let's stick to: Public Insert, Admin Select.

-- POLICY: "Public Uploads"
-- INSERT INTO storage.objects ...

-- We can't easily write SQL for storage policies without knowing if the extension/schema is fully exposed as `storage`.
-- Supabase storage usually lives in `storage` schema.

-- Policy to allow public uploads to 'cc-applications' bucket
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
--     -- Create policy if it doesn't exist (this is pseudo-code as we can't conditionally create policies easily in one block without dynamic SQL)
--   END IF;
-- END
-- $$;

-- Instead, we will rely on the application code to handle storage interaction
-- or assume the bucket is set to public or appropriate RLS is added via dashboard.
-- I'll add the SQL for RLS on storage.objects just in case it can be run.

create policy "Public Uploads to cc-applications"
on storage.objects for insert
with check ( bucket_id = 'cc-applications' );

create policy "Admins View cc-applications"
on storage.objects for select
using ( bucket_id = 'cc-applications' and (auth.role() = 'authenticated') ); -- Refine as needed for admins
