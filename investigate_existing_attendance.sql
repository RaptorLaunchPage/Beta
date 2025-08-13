-- Investigate the existing attendance record that's blocking new insertions
-- Based on your debug logs

-- 1. Check what attendance record exists for this specific slot and player
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
    u.name as player_name,
    s.organizer as slot_organizer,
    s.date as slot_date
FROM attendances a
LEFT JOIN users u ON a.player_id = u.id
LEFT JOIN slots s ON a.slot_id = s.id
WHERE a.player_id = 'ee119997-bc69-4596-aea0-9fea49514571'
AND a.slot_id = 'ee1beffa-30e2-4b6b-94ea-8e17e57ced51'
AND a.session_time = 'Match';

-- 2. Check if there are multiple performance entries for the same slot
SELECT 
    p.id,
    p.player_id,
    p.team_id,
    p.slot,
    p.match_number,
    p.kills,
    p.damage,
    p.created_at,
    u.name as player_name
FROM performances p
LEFT JOIN users u ON p.player_id = u.id
WHERE p.slot = 'ee1beffa-30e2-4b6b-94ea-8e17e57ced51'
AND p.player_id = 'ee119997-bc69-4596-aea0-9fea49514571'
ORDER BY p.created_at;

-- 3. Check ALL performances for this slot (to see if multiple players/performances exist)
SELECT 
    p.id,
    p.player_id,
    p.team_id,
    p.slot,
    p.match_number,
    p.kills,
    p.damage,
    p.created_at,
    u.name as player_name
FROM performances p
LEFT JOIN users u ON p.player_id = u.id
WHERE p.slot = 'ee1beffa-30e2-4b6b-94ea-8e17e57ced51'
ORDER BY p.created_at;

-- 4. Check if the existing attendance record has associated performance data
SELECT 
    a.id as attendance_id,
    a.created_at as attendance_created,
    a.source,
    COUNT(p.id) as performance_count,
    STRING_AGG(p.id::text, ', ') as performance_ids
FROM attendances a
LEFT JOIN performances p ON p.slot = a.slot_id AND p.player_id = a.player_id
WHERE a.player_id = 'ee119997-bc69-4596-aea0-9fea49514571'
AND a.slot_id = 'ee1beffa-30e2-4b6b-94ea-8e17e57ced51'
AND a.session_time = 'Match'
GROUP BY a.id, a.created_at, a.source;

-- 5. SOLUTION: If you want to allow multiple performances per slot per player,
-- we need to change the duplicate detection logic

-- Current logic checks: player_id + slot_id + session_time
-- This prevents multiple performances per slot per player

-- If you want multiple performances per slot, we need to link to specific performance_id
-- But since there's no performance_id in attendance table, we have a few options:

-- Option A: Allow multiple attendance records per slot per player (remove duplicate check)
-- Option B: Update existing attendance record instead of creating new one
-- Option C: Add performance_id to attendance table for unique linking

-- For now, let's see what the current data looks like with the queries above.