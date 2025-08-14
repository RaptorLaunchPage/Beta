# 🚀 Raptor Esports CRM - Automation Setup Scripts

This directory contains all the SQL scripts needed to set up automation functions, triggers, and scheduled jobs for the Raptor Esports CRM system.

## 📋 Script Execution Order

**IMPORTANT**: Run these scripts in the exact order shown below in your Supabase SQL Editor:

### 1. **01-core-automation-functions.sql**
- Core utility functions for data management
- User profile synchronization
- Performance validation
- Team statistics calculations

### 2. **02-session-attendance-automation.sql**
- Holiday detection
- Daily practice session generation
- Automatic attendance marking
- Attendance creation from performances

### 3. **03-discord-portal-automation.sql**
- Discord webhook management
- Team setting retrieval
- Message logging and cleanup
- Notification triggers

### 4. **04-business-logic-automation.sql**
- Slot expense creation
- Tryout profile synchronization
- Profile visibility controls
- Agreement status checking

### 5. **05-triggers-setup.sql**
- Database triggers for all automation functions
- Real-time data synchronization
- Validation triggers
- Notification triggers

### 6. **06-scheduled-jobs-setup.sql**
- Daily practice session generation
- Automatic absence marking
- Log cleanup jobs
- Monthly data maintenance

### 7. **07-verification-testing.sql**
- Verify all functions exist
- Check triggers are working
- Test scheduled jobs
- Basic functionality tests

### 8. **08-storage-bucket-setup.sql** ⭐ **NEW**
- Create avatars storage bucket
- Set up storage policies
- Fix avatar upload issues
- Enable public image access

## 🎯 What Each Script Does

### Core Functions (Script 1)
- **`update_updated_at_column`**: Automatically updates timestamps
- **`sync_user_profile_data`**: Syncs user data across tables
- **`update_last_login`**: Tracks user login activity
- **`validate_coach_assignment`**: Ensures valid coach-team assignments
- **`validate_performance_entry`**: Validates performance data
- **`get_team_performance_summary`**: Calculates team statistics
- **`get_player_stats`**: Generates player performance metrics

### Session Management (Script 2)
- **`is_holiday`**: Detects holidays for session scheduling
- **`generate_daily_practice_sessions`**: Creates daily practice slots
- **`auto_mark_absent_after_cutoff`**: Marks late arrivals as absent
- **`create_auto_attendance_fixed`**: Creates attendance from performances

### Discord Integration (Script 3)
- **`get_team_webhook`**: Retrieves team Discord webhooks
- **`get_team_setting`**: Gets team automation settings
- **`log_discord_message`**: Logs Discord notifications
- **`cleanup_old_discord_logs`**: Removes old log entries
- **`trigger_slot_creation_notification`**: Notifies Discord of new slots
- **`trigger_roster_update_notification`**: Notifies of roster changes

### Business Logic (Script 4)
- **`create_slot_expense`**: Automatically creates expenses for slots
- **`sync_tryout_to_profile`**: Syncs tryout data to user profiles
- **`can_view_profile`**: Controls profile visibility
- **`can_edit_profile`**: Controls profile editing permissions
- **`check_user_agreement_status`**: Checks agreement compliance

### Storage Setup (Script 8) ⭐ **NEW**
- **`avatars` bucket**: Stores profile pictures
- **Public access**: Allows viewing avatar images
- **Upload policies**: Controls who can upload avatars
- **User permissions**: Users can manage their own avatars

## 🔧 How to Run

1. **Open Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to SQL Editor

2. **Execute Scripts in Order**
   - Copy each script content
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for completion before running next script

3. **Verify Setup**
   - Run the verification script last
   - Check console output for success messages
   - Test avatar uploads in the application

## 🚨 Important Notes

### Environment Variables Required
Make sure these are set in your Supabase project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### pg_cron Extension
The scheduled jobs require the `pg_cron` extension. If it's not available:
- Contact Supabase support to enable it
- Or manually run the functions via cron jobs

### Storage Bucket
The avatar upload functionality requires the `avatars` storage bucket:
- Script 8 creates this automatically
- If you get "failed to upload" errors, run script 8 first

## 🐛 Troubleshooting

### Avatar Upload Issues
If you get "failed to upload" errors:
1. Run script 8 to create the storage bucket
2. Check browser console for detailed error messages
3. Verify environment variables are set correctly
4. Check Supabase logs for storage errors

### Function Not Found Errors
If functions are missing:
1. Ensure scripts were run in correct order
2. Check for SQL syntax errors in previous runs
3. Re-run the specific script that failed

### Permission Errors
If you get permission denied errors:
1. Verify RLS policies are set up correctly
2. Check user roles and permissions
3. Ensure service role key has proper access

## 📊 Expected Results

After running all scripts, you should have:
- ✅ 22 automation functions
- ✅ 9 database triggers
- ✅ 6 scheduled jobs
- ✅ 1 storage bucket with policies
- ✅ Avatar upload functionality working
- ✅ All automation features active

## 🎉 Success Indicators

- Avatar uploads work without errors
- Daily practice sessions are generated automatically
- Discord notifications are sent for events
- Attendance is marked automatically
- Profile data stays synchronized
- Agreement enforcement works correctly

---

**Need Help?** Check the verification script output for detailed status information about each component.