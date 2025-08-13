-- Comprehensive debug script for attendance trigger issues
-- Run each section to diagnose the problem

-- ======================================
-- SECTION 1: Check Database Schema State
-- ======================================

-- Check if attendances table has all required columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'attendances' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ======================================
-- SECTION 2: Check Triggers and Functions
-- ======================================

-- Check what triggers exist on performances table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    action_condition
FROM information_schema.triggers 
WHERE event_object_table = 'performances'
AND event_object_schema = 'public';

-- Check if our function exists
SELECT 
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_name LIKE '%attendance%' 
AND routine_schema = 'public';

-- Get function definition
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'create_auto_attendance_fixed' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ======================================
-- SECTION 3: Check Recent Data
-- ======================================

-- Check recent performance submissions
SELECT 
    p.id,
    p.player_id,
    p.team_id,
    p.slot,
    p.match_number,
    p.created_at,
    u.name as player_name,
    t.name as team_name,
    s.date as slot_date,
    s.organizer
FROM performances p
LEFT JOIN users u ON p.player_id = u.id
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN slots s ON p.slot = s.id
ORDER BY p.created_at DESC
LIMIT 5;

-- Check if ANY auto attendance records exist
SELECT 
    a.id,
    a.player_id,
    a.team_id,
    a.date,
    a.session_time,
    a.status,
    a.source,
    a.slot_id,
    a.created_at,
    u.name as player_name
FROM attendances a
LEFT JOIN users u ON a.player_id = u.id
WHERE a.source = 'auto'
ORDER BY a.created_at DESC
LIMIT 10;

-- Check ALL recent attendance records
SELECT 
    a.id,
    a.player_id,
    a.team_id,
    a.date,
    a.session_time,
    a.status,
    a.source,
    a.slot_id,
    a.created_at,
    u.name as player_name
FROM attendances a
LEFT JOIN users u ON a.player_id = u.id
ORDER BY a.created_at DESC
LIMIT 10;

-- ======================================
-- SECTION 4: Check Permissions
-- ======================================

-- Check if authenticated role can insert into attendances
SELECT 
    table_name,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'attendances' 
AND grantee = 'authenticated';

-- Check function permissions
SELECT 
    routine_name,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name LIKE '%attendance%' 
AND grantee = 'authenticated';

-- ======================================
-- SECTION 5: Test Manual Insertion
-- ======================================

-- Try to manually insert an attendance record to check for constraints
-- (Replace with actual IDs from your recent performance data)
/*
INSERT INTO public.attendances (
    player_id, 
    team_id, 
    date, 
    session_time, 
    status, 
    source, 
    marked_by, 
    slot_id
)
VALUES (
    'replace-with-actual-player-id'::uuid,
    'replace-with-actual-team-id'::uuid,
    CURRENT_DATE,
    'Match',
    'auto',
    'auto',
    NULL,
    'replace-with-actual-slot-id'::uuid
);
*/

-- ======================================
-- SECTION 6: Check for Hidden Errors
-- ======================================

-- Check if there are any RLS policies blocking inserts
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'attendances';

-- Check for any constraints that might be failing
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'attendances'
AND tc.table_schema = 'public';

-- ======================================
-- SECTION 7: Debug Output
-- ======================================

-- Enable function debugging (if supported)
-- This varies by PostgreSQL setup
-- ALTER FUNCTION public.create_auto_attendance_fixed() SET log_statement = 'all';

-- Check if there are any recent PostgreSQL logs related to our function
-- (This might not work in all environments)
-- SELECT * FROM pg_stat_user_functions WHERE funcname = 'create_auto_attendance_fixed';