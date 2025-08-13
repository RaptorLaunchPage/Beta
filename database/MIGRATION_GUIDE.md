# 🗄️ Database Migration Guide

This guide explains how to use the database migration system for the Raptors Esports CRM project.

## 📋 Overview

The migration system provides a robust way to manage database schema changes in your Supabase PostgreSQL database. It includes:

- **Version Control**: Track all database changes with timestamps
- **Rollback Support**: Safely undo migrations when needed
- **Validation**: Ensure migrations are properly formatted
- **Status Tracking**: See which migrations have been applied

## 🚀 Quick Start

### Prerequisites

1. **Environment Variables**: Make sure you have these set in your `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database Functions**: Run the migration functions setup:
   ```sql
   -- Run this in your Supabase SQL editor
   \i database/migration_functions.sql
   ```

### Basic Commands

```bash
# Apply all pending migrations
npm run migrate:up

# Check migration status
npm run migrate:status

# Create a new migration
npm run migrate:create add_new_feature

# Rollback the last migration
npm run migrate:down

# Validate all migration files
npm run migrate:validate
```

## 📁 File Structure

```
database/
├── migrations/                    # Migration files
│   ├── 20241201143000_initial_schema_setup.sql
│   ├── 20241201143000_initial_schema_setup_rollback.sql
│   └── YYYYMMDDHHMMSS_migration_name.sql
├── migration_functions.sql        # Database functions
└── MIGRATION_GUIDE.md            # This file
```

## 📝 Creating Migrations

### Using the CLI

```bash
npm run migrate:create add_user_preferences
```

This creates a new migration file with the current timestamp:
```
database/migrations/20241201143000_add_user_preferences.sql
```

### Migration File Format

```sql
-- Migration: add_user_preferences
-- Created: 2024-12-01T14:30:00.000Z
-- Description: Add user preferences table

BEGIN;

-- Add your SQL here
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light',
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

COMMIT;
```

### Best Practices

1. **Always use transactions**: Wrap your SQL in `BEGIN;` and `COMMIT;`
2. **Use IF NOT EXISTS**: Prevents errors if objects already exist
3. **Add indexes**: Create indexes for foreign keys and frequently queried columns
4. **Be descriptive**: Use clear names and add comments
5. **Test rollbacks**: Always create rollback files for complex migrations

## 🔄 Rollback Support

### Creating Rollback Files

For each migration, create a corresponding rollback file:
```
20241201143000_add_user_preferences.sql
20241201143000_add_user_preferences_rollback.sql
```

### Rollback File Example

```sql
-- Rollback for: add_user_preferences
-- This will undo the changes made in the migration

BEGIN;

-- Drop the table created in the migration
DROP TABLE IF EXISTS user_preferences CASCADE;

COMMIT;
```

### Rolling Back Migrations

```bash
# Rollback the last migration
npm run migrate:down

# Note: Only the most recent migration can be rolled back
```

## 🔍 Migration Status

Check which migrations have been applied:

```bash
npm run migrate:status
```

Output:
```
📊 Migration Status:
==================
✅ 20241201143000 - initial_schema_setup
⏳ 20241201144000 - add_user_preferences

📈 Summary: 2 total, 1 applied, 1 pending
```

## ✅ Validation

Validate your migration files before applying:

```bash
npm run migrate:validate
```

This checks for:
- Proper transaction blocks (`BEGIN;` and `COMMIT;`)
- Non-empty files
- Valid file naming format

## 🛠️ Advanced Usage

### Using TypeScript Version

For better type safety and modern features:

```bash
# Use TypeScript version
npm run migrate:ts up
npm run migrate:ts status
npm run migrate:ts create new_migration
```

### Manual Migration Application

If you need to apply migrations manually:

```bash
# Apply specific migration
node scripts/migrate.js up

# Check status
node scripts/migrate.js status

# Create migration
node scripts/migrate.js create migration_name
```

### Environment-Specific Migrations

You can create environment-specific migrations by checking environment variables:

```sql
-- Migration: add_production_only_feature
BEGIN;

-- Only run in production
DO $$
BEGIN
    IF current_setting('app.environment') = 'production' THEN
        -- Production-specific SQL
        CREATE TABLE production_only_table (...);
    END IF;
END $$;

COMMIT;
```

## 🚨 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```
   ❌ Missing required environment variables:
      NEXT_PUBLIC_SUPABASE_URL
      SUPABASE_SERVICE_ROLE_KEY
   ```
   **Solution**: Set the environment variables in your `.env.local` file.

2. **Permission Denied**
   ```
   ❌ Failed to create migration table: permission denied
   ```
   **Solution**: Make sure you're using the service role key, not the anon key.

3. **Migration Already Applied**
   ```
   ❌ Migration already exists
   ```
   **Solution**: Check the migration status to see which migrations are already applied.

4. **Invalid Migration Format**
   ```
   ⚠️ Skipping invalid migration file: invalid_name.sql
   ```
   **Solution**: Use the correct naming format: `YYYYMMDDHHMMSS_descriptive_name.sql`

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
DEBUG=true npm run migrate:up
```

## 📚 Migration Examples

### Adding a New Table

```sql
-- Migration: add_tournament_results
BEGIN;

CREATE TABLE IF NOT EXISTS tournament_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    placement INTEGER NOT NULL,
    prize_money NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament_id ON tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_team_id ON tournament_results(team_id);

COMMIT;
```

### Adding a Column

```sql
-- Migration: add_user_bio_column
BEGIN;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT;

COMMIT;
```

### Modifying Data

```sql
-- Migration: update_existing_data
BEGIN;

-- Update existing records
UPDATE users 
SET status = 'Active' 
WHERE status IS NULL;

-- Add a constraint
ALTER TABLE users 
ALTER COLUMN status SET NOT NULL;

COMMIT;
```

## 🔐 Security Considerations

1. **Service Role Key**: Only use the service role key for migrations, never the anon key
2. **Environment Variables**: Keep your keys secure and never commit them to version control
3. **Backup**: Always backup your database before running migrations in production
4. **Testing**: Test migrations in a development environment first

## 📞 Support

If you encounter issues with the migration system:

1. Check the troubleshooting section above
2. Validate your migration files: `npm run migrate:validate`
3. Check the migration status: `npm run migrate:status`
4. Review the migration logs in your Supabase dashboard

## 🔄 Migration Workflow

### Development Workflow

1. **Create Migration**: `npm run migrate:create feature_name`
2. **Edit Migration**: Add your SQL to the generated file
3. **Test Locally**: `npm run migrate:up` (in development)
4. **Commit**: Add migration files to version control
5. **Deploy**: Run migrations in production

### Production Deployment

1. **Backup**: Create a database backup
2. **Validate**: `npm run migrate:validate`
3. **Check Status**: `npm run migrate:status`
4. **Apply**: `npm run migrate:up`
5. **Verify**: Check that the application works correctly

### Emergency Rollback

If a migration causes issues in production:

1. **Stop Application**: Prevent further issues
2. **Rollback**: `npm run migrate:down`
3. **Investigate**: Fix the migration file
4. **Redeploy**: Apply the corrected migration