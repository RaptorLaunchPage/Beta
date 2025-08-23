-- Diagnostic script to check existing tables and foreign key constraints
-- Run this first to see what actually exists in your database

-- Check which tables exist that might reference teams
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE column_name LIKE '%team%' 
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check existing foreign key constraints to teams
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'teams'
    AND ccu.column_name = 'id'
ORDER BY tc.table_name, tc.constraint_name;

-- Check if teams table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'teams' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing RLS policies for teams table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'teams'
ORDER BY policyname;

-- Check if RLS is enabled on teams table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'teams' 
    AND schemaname = 'public';