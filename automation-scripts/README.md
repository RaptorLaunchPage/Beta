# 🚀 Raptor Esports CRM Automation Scripts

This directory contains all the automation scripts for the Raptor Esports CRM system. These scripts set up database functions, triggers, and scheduled jobs to automate various business processes.

## 📋 Script Execution Order

**IMPORTANT**: Run these scripts in the exact order shown below. Each script depends on functions created in previous scripts.

### 1. Core Automation Functions
**File**: `01-core-automation-functions.sql`
- **Purpose**: Creates foundational utility and validation functions
- **Functions Created**: 7
  - `update_updated_at_column()` - Auto-update timestamps
  - `sync_user_profile_data()` - Sync user profiles
  - `update_last_login()` - Track login times
  - `validate_coach_assignment()` - Validate coach assignments
  - `validate_performance_entry()` - Validate performance data
  - `get_team_performance_summary()` - Team performance stats
  - `get_player_stats()` - Player performance stats

### 2. Session & Attendance Automation
**File**: `02-session-attendance-automation.sql`
- **Purpose**: Creates session and attendance automation functions
- **Functions Created**: 4
  - `is_holiday()` - Check if date is a holiday
  - `generate_daily_practice_sessions()` - Auto-generate practice sessions
  - `auto_mark_absent_after_cutoff()` - Auto-mark absence after cutoff
  - `create_auto_attendance_fixed()` - Create attendance from performances

### 3. Discord Portal Automation
**File**: `03-discord-portal-automation.sql`
- **Purpose**: Creates Discord webhook and notification automation
- **Functions Created**: 6
  - `get_team_webhook()` - Get team's Discord webhook
  - `get_team_setting()` - Get team automation settings
  - `log_discord_message()` - Log Discord message attempts
  - `cleanup_old_discord_logs()` - Clean old Discord logs
  - `trigger_slot_creation_notification()` - Notify on slot creation
  - `trigger_roster_update_notification()` - Notify on roster updates

### 4. Business Logic Automation
**File**: `04-business-logic-automation.sql`
- **Purpose**: Creates business logic automation functions
- **Functions Created**: 5
  - `create_slot_expense()` - Auto-create slot expenses
  - `sync_tryout_to_profile()` - Sync tryout data to profiles
  - `can_view_profile()` - Profile visibility control
  - `can_edit_profile()` - Profile edit permissions
  - `check_user_agreement_status()` - Agreement enforcement

### 5. Triggers Setup
**File**: `05-triggers-setup.sql`
- **Purpose**: Creates all triggers that use the automation functions
- **Triggers Created**: 9
  - `update_users_updated_at` - Auto-update timestamps
  - `sync_user_profile_trigger` - Sync profile data
  - `validate_coach_assignment_trigger` - Validate coaches
  - `validate_performance_entry_trigger` - Validate performances
  - `auto_attendance_on_performance` - Auto-create attendance
  - `trigger_create_slot_expense` - Auto-create expenses
  - `trigger_sync_tryout_to_profile` - Sync tryout data
  - `trigger_slot_creation_notification` - Discord slot notifications
  - `trigger_roster_update_notification` - Discord roster notifications

### 6. Scheduled Jobs Setup
**File**: `06-scheduled-jobs-setup.sql`
- **Purpose**: Sets up automated scheduled jobs using pg_cron
- **Jobs Created**: 6
  - `generate-daily-practice-sessions` - Daily at 6:00 AM
  - `auto-mark-absence-after-cutoff` - Every 30 minutes
  - `cleanup-old-discord-logs` - Sundays at 2:00 AM
  - `cleanup-attendance-debug-logs` - Sundays at 2:30 AM
  - `monthly-data-cleanup` - 1st of month at 3:00 AM
  - `hourly-health-check` - Every hour

### 7. Verification & Testing
**File**: `07-verification-testing.sql`
- **Purpose**: Verifies all automation functions and provides summary
- **What it does**:
  - Checks all functions exist
  - Verifies all triggers are created
  - Confirms scheduled jobs are set up
  - Tests basic functionality
  - Provides comprehensive summary

## 🛠️ How to Execute

### In Supabase SQL Editor:

1. **Open Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to SQL Editor

2. **Execute Scripts in Order**
   - Copy and paste each script content
   - Run them in the exact order shown above
   - Wait for each script to complete before running the next

3. **Monitor Output**
   - Each script will show success messages
   - The final verification script will confirm everything is working

### Example Execution:

```sql
-- Run Script 1
-- Copy content from 01-core-automation-functions.sql
-- Execute and wait for success message

-- Run Script 2  
-- Copy content from 02-session-attendance-automation.sql
-- Execute and wait for success message

-- Continue with remaining scripts...
```

## 🔧 Automation Features

Once all scripts are executed, your system will have:

### ✅ User Management Automation
- Automatic profile synchronization
- Login time tracking
- Profile visibility controls
- Agreement enforcement

### ✅ Session & Attendance Automation
- Daily practice session generation
- Automatic attendance creation from performances
- Auto-mark absence after cutoff time
- Holiday-aware scheduling

### ✅ Discord Integration
- Automatic webhook notifications
- Message logging and retry
- Team-specific automation settings
- Log cleanup and maintenance

### ✅ Business Logic Automation
- Automatic slot expense creation
- Tryout data synchronization
- Data validation and integrity checks
- Performance statistics calculation

### ✅ Scheduled Maintenance
- Daily session generation
- Regular absence marking
- Weekly log cleanup
- Monthly data maintenance
- Hourly health checks

## ⚠️ Important Notes

### Prerequisites
- Supabase project with all tables created (from migration #19)
- pg_cron extension enabled (usually available by default)
- Proper RLS policies in place

### Dependencies
- Each script depends on the previous ones
- Don't skip scripts or change the order
- Ensure each script completes successfully before running the next

### Monitoring
- Check the verification script output
- Monitor scheduled job execution in Supabase dashboard
- Review automation logs for any issues

### Troubleshooting
- If a script fails, check the error message
- Ensure all required tables exist
- Verify RLS policies are properly configured
- Check that pg_cron extension is enabled

## 📊 Expected Results

After running all scripts, you should see:

- **22 automation functions** created
- **9 triggers** active
- **6 scheduled jobs** running
- **Comprehensive verification** showing all systems operational

## 🚀 Next Steps

After automation setup:

1. **Test Agreement Flow**
   - Try accepting agreements as different user roles
   - Verify enforcement settings work

2. **Test Discord Integration**
   - Create a slot and verify Discord notification
   - Check webhook settings and logs

3. **Monitor Automation**
   - Watch scheduled jobs execute
   - Review attendance automation
   - Check session generation

4. **Configure Settings**
   - Set up Discord webhooks
   - Configure team automation preferences
   - Adjust agreement enforcement settings

---

**Need Help?** Check the verification script output for any missing components or errors.