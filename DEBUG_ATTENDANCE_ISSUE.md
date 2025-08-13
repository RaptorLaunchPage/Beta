# Debug Guide: Attendance Records Not Showing

## Problem
After fixing the initial database constraint errors, performance submissions are working but attendance records are not being created or are not visible in the UI.

## Root Cause Investigation

The issue could be one of several problems:

1. **Trigger not applied/active**: The fix script wasn't applied or the trigger isn't working
2. **RLS (Row Level Security) blocking inserts**: Database policies preventing the function from inserting
3. **Silent errors in function**: Function failing but not reporting errors
4. **Permissions issues**: Function lacking proper permissions to insert
5. **Data type mismatches**: Incorrect data types causing silent failures
6. **UI filtering issues**: Records being created but not displayed due to filtering logic

## Step-by-Step Debugging Process

### Step 1: Apply the Debug Version
Apply the script `/workspace/scripts/17-debug-attendance-with-logging.sql` to your database. This version includes comprehensive logging.

### Step 2: Test Performance Submission
Submit a new performance entry through the UI.

### Step 3: Check Debug Logs
Run this query to see what happened:
```sql
SELECT * FROM public.attendance_debug_log ORDER BY timestamp DESC LIMIT 20;
```

### Step 4: Check for Trigger Existence
Run `/workspace/comprehensive_attendance_debug.sql` sections 1-2 to verify the trigger exists.

### Step 5: Check Recent Data
Run sections 3-4 of the comprehensive debug script to check recent data and permissions.

## Expected Debug Log Output

### If Working Correctly:
```
Trigger called for performance
Slot lookup result  
Final values determined
Slot-based duplicate check
Successfully inserted slot-based attendance
```

### If Trigger Not Called:
- No debug logs appear = trigger not active or not applied

### If Permission Issues:
```
Trigger called for performance
...
Error inserting slot-based attendance: permission denied
```

### If RLS Blocking:
```
Trigger called for performance
...
Error inserting slot-based attendance: new row violates row-level security policy
```

## Common Solutions

### If Trigger Not Applied:
1. Apply `/workspace/scripts/17-debug-attendance-with-logging.sql`
2. Verify with: `SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'performances';`

### If RLS Blocking:
Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'attendances';
```

May need to add a policy allowing system/auto inserts:
```sql
CREATE POLICY "Allow auto attendance creation" ON public.attendances
FOR INSERT WITH CHECK (source = 'auto');
```

### If Permissions Missing:
```sql
GRANT INSERT ON public.attendances TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_auto_attendance_fixed() TO authenticated;
```

### If Function Doesn't Exist:
Re-apply the complete script `/workspace/scripts/17-debug-attendance-with-logging.sql`

## Manual Testing

Use the test function to verify logic:
```sql
-- Apply test_attendance_function.sql first, then:
SELECT public.test_attendance_creation(
    'actual-player-uuid'::uuid,
    'actual-team-uuid'::uuid, 
    'actual-slot-uuid'::uuid
);
```

## Verification Queries

### Check if trigger exists:
```sql
SELECT trigger_name, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'performances';
```

### Check recent performances:
```sql
SELECT p.id, p.player_id, p.team_id, p.slot, p.created_at
FROM performances p 
ORDER BY created_at DESC LIMIT 5;
```

### Check recent attendance:
```sql
SELECT a.id, a.player_id, a.slot_id, a.source, a.session_time, a.created_at
FROM attendances a 
WHERE a.source = 'auto' 
ORDER BY created_at DESC LIMIT 10;
```

### Check all attendance (in case filtering issue):
```sql
SELECT COUNT(*) as total_attendance,
       COUNT(*) FILTER (WHERE source = 'auto') as auto_attendance,
       COUNT(*) FILTER (WHERE session_time = 'Match') as match_attendance
FROM attendances;
```

## Cleanup After Debugging

Once the issue is identified and fixed, you can remove the debug logging:
```sql
-- Remove debug table
DROP TABLE IF EXISTS public.attendance_debug_log;

-- Replace with production version without logging
-- Apply the final corrected script without debug code
```

## Next Steps

1. Apply the debug script
2. Test a performance submission  
3. Check debug logs to identify the exact failure point
4. Apply the appropriate solution based on the logs
5. Re-test to confirm the fix works
6. Clean up debug code once resolved