# Team Deletion Issue Fix

## Problem Description

When trying to delete teams or archive them as an admin, the system returns "failed to delete" error. This issue is caused by missing foreign key constraint configurations and Row Level Security (RLS) policies.

## Root Cause Analysis

### 1. Missing ON DELETE CASCADE Clauses

Several foreign key constraints that reference `teams.id` are missing the `ON DELETE CASCADE` clause, which prevents team deletion when related records exist:

**Tables with missing CASCADE constraints:**
- `users.team_id` → `teams.id` (should be SET NULL)
- `holidays.team_id` → `teams.id` (missing CASCADE)
- `practice_session_config.team_id` → `teams.id` (missing CASCADE)
- `discord_webhooks.team_id` → `teams.id` (missing CASCADE)
- `communication_logs.team_id` → `teams.id` (missing CASCADE)
- `communication_settings.team_id` → `teams.id` (missing CASCADE)
- `discord_servers.connected_team_id` → `teams.id` (should be SET NULL)
- `performance_records.team_id` → `teams.id` (missing CASCADE)
- `tryout_selections.assigned_team_id` → `teams.id` (should be SET NULL)

### 2. Missing RLS DELETE Policy

The `teams` table has RLS enabled but lacks a DELETE policy, preventing any user from deleting teams even with proper permissions.

## Solution

### Step 1: Apply Database Schema Fixes

Run the SQL script `fix-team-deletion-constraints.sql` to:

1. **Fix Foreign Key Constraints:**
   - Add `ON DELETE CASCADE` to tables that should be deleted with the team
   - Add `ON DELETE SET NULL` to tables that should retain records but clear team reference

2. **Add RLS Policies:**
   - Create DELETE policy for admins and managers
   - Create UPDATE policy for admins and managers  
   - Create INSERT policy for admins and managers

### Step 2: Verify Permissions

The role system already correctly configures team deletion permissions:

```typescript
// From lib/role-system.ts
admin: {
  permissions: {
    deleteTeams: true,  // ✅ Admins can delete teams
  }
},
manager: {
  permissions: {
    deleteTeams: false, // ❌ Managers cannot delete teams (by design)
  }
}
```

**Note:** Only admins can delete teams. Managers can create, update, and archive teams but cannot delete them.

### Step 3: Test the Fix

1. **Test Team Deletion:**
   - Login as admin
   - Navigate to Team Management
   - Try deleting a team
   - Should succeed without errors

2. **Test Team Archiving:**
   - Login as admin or manager
   - Use the monthly stats API to archive a team
   - Should update team status to 'archived'

## Implementation Details

### Foreign Key Strategy

- **CASCADE Delete:** For data that belongs exclusively to the team (sessions, performances, slots, etc.)
- **SET NULL:** For data that should persist but lose team association (users, tryout selections, etc.)

### RLS Policy Strategy

- **DELETE:** Only admins can delete teams
- **UPDATE:** Only admins and managers can update teams
- **INSERT:** Only admins and managers can create teams
- **SELECT:** All authenticated users can view teams (with role-based filtering)

## Files Modified

1. **Database Schema:** `fix-team-deletion-constraints.sql`
2. **Documentation:** `TEAM_DELETION_FIX.md`

## Verification Queries

After applying the fix, run these queries to verify:

```sql
-- Check foreign key constraints
SELECT 
    tc.table_name, 
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND rc.unique_constraint_name IN (
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'teams' AND constraint_type = 'PRIMARY KEY'
    );

-- Check RLS policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'teams'
ORDER BY policyname;
```

## Expected Results

After applying the fix:

1. ✅ Admins can delete teams successfully
2. ✅ Related data is properly cleaned up (CASCADE) or preserved (SET NULL)
3. ✅ Team archiving works correctly
4. ✅ No foreign key constraint violations
5. ✅ RLS policies properly enforce permissions

## Rollback Plan

If issues occur, the original constraints can be restored by:

1. Dropping the new constraints
2. Re-adding the original constraints without CASCADE/SET NULL
3. Removing the new RLS policies

However, this would restore the original deletion issue.