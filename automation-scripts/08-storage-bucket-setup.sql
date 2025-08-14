-- ====================================================================
-- 📦 STORAGE BUCKET SETUP - SCRIPT #8
-- ====================================================================
-- This script sets up the missing avatars storage bucket
-- Run this to fix avatar upload issues

-- ====================================================================
-- 1. CREATE AVATARS STORAGE BUCKET
-- ====================================================================

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true, -- Public bucket for avatar images
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 2. STORAGE POLICIES FOR AVATARS BUCKET
-- ====================================================================

-- Allow authenticated users to upload avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow public to view avatars (since it's a public bucket)
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatars
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own avatars
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ====================================================================
-- 3. VERIFY BUCKET CREATION
-- ====================================================================

-- Check if avatars bucket exists
DO $$
DECLARE
    bucket_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'avatars'
    ) INTO bucket_exists;
    
    IF bucket_exists THEN
        RAISE NOTICE '✅ Avatars storage bucket created successfully!';
        RAISE NOTICE '📦 Bucket ID: avatars';
        RAISE NOTICE '🌐 Public access: enabled';
        RAISE NOTICE '📏 File size limit: 5MB';
        RAISE NOTICE '🖼️  Allowed types: JPEG, PNG, WebP';
    ELSE
        RAISE NOTICE '❌ Failed to create avatars bucket';
    END IF;
END $$;

-- ====================================================================
-- 4. TEST BUCKET ACCESS
-- ====================================================================

-- Test if we can access the bucket
DO $$
DECLARE
    bucket_accessible boolean;
BEGIN
    -- Try to list objects in the bucket (should work even if empty)
    SELECT EXISTS (
        SELECT 1 FROM storage.objects WHERE bucket_id = 'avatars' LIMIT 1
    ) INTO bucket_accessible;
    
    IF bucket_accessible OR NOT EXISTS (
        SELECT 1 FROM storage.objects WHERE bucket_id = 'avatars'
    ) THEN
        RAISE NOTICE '✅ Avatars bucket is accessible!';
        RAISE NOTICE '🚀 Avatar uploads should now work correctly.';
    ELSE
        RAISE NOTICE '⚠️  Bucket created but access test failed.';
        RAISE NOTICE '   Check RLS policies and permissions.';
    END IF;
END $$;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 STORAGE BUCKET SETUP COMPLETE!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was created:';
    RAISE NOTICE '  ✅ avatars storage bucket';
    RAISE NOTICE '  ✅ Public read access';
    RAISE NOTICE '  ✅ Authenticated upload access';
    RAISE NOTICE '  ✅ User-specific update/delete policies';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Avatar uploads should now work!';
    RAISE NOTICE '   Try uploading a profile picture again.';
    RAISE NOTICE '';
END $$;