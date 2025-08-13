# Database Documentation

This directory contains the database schema and setup files for the Gaming Team Management Platform.

## 📁 Files

### `discord-portal-schema.sql`
Complete database schema including:
- User management tables
- Team and roster management
- Performance tracking
- Discord integration
- Attendance and finance modules
- RLS policies and triggers

## 🚀 Setup Instructions

### 1. Initial Setup
1. Create a new Supabase project
2. Go to SQL Editor in Supabase Dashboard
3. Run the `discord-portal-schema.sql` file

### 2. Required Database Functions

The application relies on a custom function for user updates:

```sql
-- Add unique constraint for profiles table (if it doesn't exist)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
```

### 3. Environment Configuration

For development, RLS is disabled. To disable RLS on users table:

```sql
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**Note**: Re-enable RLS for production with proper policies.

## 🔧 Database Functions

### `bulletproof_user_update`
Handles user role and team updates with conflict resolution.

**Parameters:**
- `p_user_id`: UUID of the user to update
- `p_role`: New role for the user
- `p_team_id`: New team assignment (optional)

**Returns:** JSON object with success status and updated user data

### `sync_user_profile_data`
Automatically syncs user data between users and profiles tables when users are updated.

## 📊 Key Tables

### `users`
- Primary user information
- Role and team assignments
- Profile data

### `teams`
- Team information
- Tier and status tracking

### `performances`
- Match performance data
- Player statistics
- Performance metrics

### `discord_webhooks`
- Discord integration settings
- Webhook configurations

### `communication_logs`
- Discord message tracking
- Communication history

## 🔐 Security

### Row Level Security (RLS)
- Currently disabled for development
- Should be enabled for production
- Policies control data access based on user roles

### Access Control
- Role-based permissions
- Team-based data filtering
- Secure function execution

## 🚨 Important Notes

1. **Development vs Production**: RLS is disabled for development but should be enabled for production
2. **Unique Constraints**: Ensure `profiles_user_id_unique` constraint exists for proper function operation
3. **Function Permissions**: Database functions use `SECURITY DEFINER` for elevated permissions
4. **Data Integrity**: Triggers maintain data consistency across related tables

## 🔄 Maintenance

### Regular Tasks
- Monitor performance table growth
- Archive old communication logs
- Update team assignments as needed
- Review and update RLS policies for production

### Troubleshooting
- Use the debug page at `/dashboard/debug` to test API connectivity
- Check Supabase logs for database errors
- Verify function permissions and constraints