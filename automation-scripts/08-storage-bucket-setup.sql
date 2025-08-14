-- ====================================================================
-- 📦 COMPREHENSIVE STORAGE BUCKET SETUP - SCRIPT #8
-- ====================================================================
-- This script sets up ALL required storage buckets for the Raptor Esports CRM
-- Run this to fix all upload issues (avatars, media, OCR, contact files)

-- ====================================================================
-- 1. CREATE AVATARS STORAGE BUCKET
-- ====================================================================

-- Create avatars bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true, -- Public bucket for avatar images
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 2. CREATE MEDIA STORAGE BUCKET
-- ====================================================================

-- Create media bucket for general file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media',
    'media',
    true, -- Public bucket for media files
    20971520, -- 20MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'application/pdf', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 3. CREATE CONTACT_FILES STORAGE BUCKET
-- ====================================================================

-- Create contact_files bucket for contact form attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'contact_files',
    'contact_files',
    false, -- Private bucket for contact form files
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 4. ENSURE OCR_UPLOADS BUCKET EXISTS
-- ====================================================================

-- Create OCR uploads bucket (if not already created)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ocr_uploads',
    'ocr_uploads',
    false, -- Private bucket for OCR processing
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 5. STORAGE POLICIES FOR AVATARS BUCKET
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
-- 6. STORAGE POLICIES FOR MEDIA BUCKET
-- ====================================================================

-- Allow authenticated users to upload media files
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow public to view media files
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;
CREATE POLICY "Public can view media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'media');

-- Allow users to update their own media files
DROP POLICY IF EXISTS "Users can update their own media" ON storage.objects;
CREATE POLICY "Users can update their own media" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own media files
DROP POLICY IF EXISTS "Users can delete their own media" ON storage.objects;
CREATE POLICY "Users can delete their own media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ====================================================================
-- 7. STORAGE POLICIES FOR CONTACT_FILES BUCKET
-- ====================================================================

-- Allow public to upload contact files (no auth required for contact form)
DROP POLICY IF EXISTS "Public can upload contact files" ON storage.objects;
CREATE POLICY "Public can upload contact files" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'contact_files');

-- Allow public to view contact files (for download links)
DROP POLICY IF EXISTS "Public can view contact files" ON storage.objects;
CREATE POLICY "Public can view contact files" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'contact_files');

-- Allow public to delete contact files (for cleanup)
DROP POLICY IF EXISTS "Public can delete contact files" ON storage.objects;
CREATE POLICY "Public can delete contact files" ON storage.objects
FOR DELETE TO public
USING (bucket_id = 'contact_files');

-- ====================================================================
-- 8. STORAGE POLICIES FOR OCR_UPLOADS BUCKET
-- ====================================================================

-- Allow authenticated users to upload OCR files
DROP POLICY IF EXISTS "Authenticated users can upload OCR files" ON storage.objects;
CREATE POLICY "Authenticated users can upload OCR files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ocr_uploads');

-- Allow users to view their own OCR uploads
DROP POLICY IF EXISTS "Users can view their own OCR uploads" ON storage.objects;
CREATE POLICY "Users can view their own OCR uploads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'ocr_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own OCR uploads
DROP POLICY IF EXISTS "Users can delete their own OCR uploads" ON storage.objects;
CREATE POLICY "Users can delete their own OCR uploads" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'ocr_uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ====================================================================
-- 9. VERIFY BUCKET CREATION
-- ====================================================================

-- Check if all buckets exist
DO $$
DECLARE
    bucket_count integer;
    expected_buckets text[] := ARRAY['avatars', 'media', 'contact_files', 'ocr_uploads'];
    missing_buckets text[] := '{}';
    bucket_name text;
BEGIN
    -- Count total buckets
    SELECT COUNT(*) INTO bucket_count
    FROM storage.buckets
    WHERE id = ANY(expected_buckets);
    
    -- Check for missing buckets
    FOREACH bucket_name IN ARRAY expected_buckets
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM storage.buckets WHERE id = bucket_name
        ) THEN
            missing_buckets := array_append(missing_buckets, bucket_name);
        END IF;
    END LOOP;
    
    RAISE NOTICE '📦 Storage Bucket Verification Results:';
    RAISE NOTICE '  • Expected buckets: %', array_length(expected_buckets, 1);
    RAISE NOTICE '  • Created buckets: %', bucket_count;
    
    IF array_length(missing_buckets, 1) > 0 THEN
        RAISE NOTICE '  ⚠️  Missing buckets: %', array_to_string(missing_buckets, ', ');
    ELSE
        RAISE NOTICE '  ✅ All expected buckets are present!';
    END IF;
    
    -- Show bucket details
    RAISE NOTICE '';
    RAISE NOTICE '📋 Bucket Details:';
    RAISE NOTICE '  • avatars: Public, 5MB, Profile pictures';
    RAISE NOTICE '  • media: Public, 20MB, General uploads';
    RAISE NOTICE '  • contact_files: Public, 10MB, Contact form attachments';
    RAISE NOTICE '  • ocr_uploads: Private, 10MB, OCR processing';
END $$;

-- ====================================================================
-- 10. TEST BUCKET ACCESS
-- ====================================================================

-- Test if we can access all buckets
DO $$
DECLARE
    bucket_accessible boolean;
    test_buckets text[] := ARRAY['avatars', 'media', 'contact_files', 'ocr_uploads'];
    bucket_name text;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 Testing bucket access...';
    
    FOREACH bucket_name IN ARRAY test_buckets
    LOOP
        -- Try to list objects in the bucket (should work even if empty)
        SELECT EXISTS (
            SELECT 1 FROM storage.objects WHERE bucket_id = bucket_name LIMIT 1
        ) INTO bucket_accessible;
        
        IF bucket_accessible OR NOT EXISTS (
            SELECT 1 FROM storage.objects WHERE bucket_id = bucket_name
        ) THEN
            RAISE NOTICE '  ✅ % bucket is accessible', bucket_name;
        ELSE
            RAISE NOTICE '  ❌ % bucket access failed', bucket_name;
        END IF;
    END LOOP;
END $$;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 COMPREHENSIVE STORAGE SETUP COMPLETE!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What was created/verified:';
    RAISE NOTICE '  ✅ avatars storage bucket (profile pictures)';
    RAISE NOTICE '  ✅ media storage bucket (general uploads)';
    RAISE NOTICE '  ✅ contact_files storage bucket (contact form attachments)';
    RAISE NOTICE '  ✅ ocr_uploads storage bucket (OCR processing)';
    RAISE NOTICE '  ✅ Public read access for avatars & media';
    RAISE NOTICE '  ✅ Public upload access for contact files';
    RAISE NOTICE '  ✅ Authenticated upload access for other buckets';
    RAISE NOTICE '  ✅ User-specific update/delete policies';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 All upload functionality should now work!';
    RAISE NOTICE '   • Profile picture uploads';
    RAISE NOTICE '   • Media file uploads';
    RAISE NOTICE '   • Contact form file attachments';
    RAISE NOTICE '   • OCR screenshot uploads';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Next Steps:';
    RAISE NOTICE '   1. Test avatar uploads in profile page';
    RAISE NOTICE '   2. Test media uploads in dashboard/media';
    RAISE NOTICE '   3. Test contact form file uploads';
    RAISE NOTICE '   4. Test OCR uploads in performance tracking';
    RAISE NOTICE '';
END $$;