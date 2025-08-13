-- Debug script to check attendance trigger status
-- Run this to diagnose why attendance records are not being created

-- 1. Check what triggers exist on the performances table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'performances';

-- 2. Check if our function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%attendance%' 
AND routine_schema = 'public';

-- 3. Check recent performance entries
SELECT 
    p.id,
    p.player_id,
    p.team_id,
    p.slot,
    p.created_at,
    u.name as player_name,
    t.name as team_name,
    s.date as slot_date,
    s.organizer as slot_organizer
FROM performances p
LEFT JOIN users u ON p.player_id = u.id
LEFT JOIN teams t ON p.team_id = t.id
LEFT JOIN slots s ON p.slot = s.id
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. Check if any attendance records exist for recent performances
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
AND a.session_time = 'Match'
ORDER BY a.created_at DESC
LIMIT 10;

-- 5. Check if there are any error logs (if logging is enabled)
-- This might not work if no logging system is in place
-- SELECT * FROM pg_stat_user_functions WHERE funcname LIKE '%attendance%';