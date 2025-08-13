# 🗄️ Complete Database Migration System

This project now includes a comprehensive database migration system for managing schema changes in your Supabase PostgreSQL database. The system provides version control, rollback capabilities, validation, and status tracking for all database changes.

## 🎯 What's Included

### Core Migration System
- **Migration Scripts**: Both JavaScript and TypeScript versions
- **Database Functions**: PostgreSQL functions for migration management
- **CLI Interface**: Easy-to-use command-line tools
- **Rollback Support**: Safe undo capabilities
- **Validation**: Migration file validation
- **Status Tracking**: See which migrations are applied

### Files Created
```
scripts/
├── migrate.js              # JavaScript migration script
├── migrate.ts              # TypeScript migration script
└── setup-migrations.js     # Initial setup script

database/
├── migrations/             # Migration files directory
│   ├── 20241201143000_initial_schema_setup.sql
│   ├── 20241201143000_initial_schema_setup_rollback.sql
│   ├── 20241201144000_add_user_preferences.sql
│   └── 20241201144000_add_user_preferences_rollback.sql
├── migration_functions.sql # Database functions
└── MIGRATION_GUIDE.md     # Detailed usage guide

README_MIGRATIONS.md        # This file
```

## 🚀 Quick Start

### 1. Setup Environment Variables
Add these to your `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Initialize the Migration System
```bash
npm run migrate:setup
```

### 3. Apply Migrations
```bash
npm run migrate:up
```

### 4. Check Status
```bash
npm run migrate:status
```

## 📋 Available Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `migrate:setup` | Initialize migration system | `npm run migrate:setup` |
| `migrate:up` | Apply all pending migrations | `npm run migrate:up` |
| `migrate:down` | Rollback last migration | `npm run migrate:down` |
| `migrate:status` | Show migration status | `npm run migrate:status` |
| `migrate:create` | Create new migration | `npm run migrate:create name` |
| `migrate:validate` | Validate migration files | `npm run migrate:validate` |
| `migrate:ts` | Use TypeScript version | `npm run migrate:ts up` |

## 🔧 How It Works

### Migration File Format
Migrations use the format: `YYYYMMDDHHMMSS_descriptive_name.sql`

Example: `20241201143000_initial_schema_setup.sql`

### Migration Structure
Each migration should:
1. Start with `BEGIN;`
2. Contain your SQL changes
3. End with `COMMIT;`
4. Include rollback file (optional but recommended)

### Example Migration
```sql
-- Migration: add_new_table
BEGIN;

CREATE TABLE IF NOT EXISTS new_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);

COMMIT;
```

### Rollback File
```sql
-- Rollback for: add_new_table
BEGIN;

DROP TABLE IF EXISTS new_table CASCADE;

COMMIT;
```

## 🛡️ Safety Features

### Transaction Support
- All migrations run in transactions
- Automatic rollback on errors
- Safe execution environment

### Validation
- Checks for proper transaction blocks
- Validates file naming format
- Ensures non-empty files

### Status Tracking
- Tracks applied migrations in database
- Prevents duplicate execution
- Shows pending migrations

## 📊 Migration Status Example

```bash
$ npm run migrate:status

📊 Migration Status:
==================
✅ 20241201143000 - initial_schema_setup
✅ 20241201144000 - add_user_preferences
⏳ 20241201145000 - add_new_feature

📈 Summary: 3 total, 2 applied, 1 pending
```

## 🔄 Workflow Examples

### Creating a New Feature

1. **Create Migration**
   ```bash
   npm run migrate:create add_tournament_results
   ```

2. **Edit Migration File**
   ```sql
   -- Add your SQL to the generated file
   CREATE TABLE tournament_results (...);
   ```

3. **Apply Migration**
   ```bash
   npm run migrate:up
   ```

4. **Verify Status**
   ```bash
   npm run migrate:status
   ```

### Rolling Back Changes

```bash
# Rollback the last migration
npm run migrate:down

# Check status after rollback
npm run migrate:status
```

## 🚨 Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   ```bash
   # Set in .env.local
   NEXT_PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   ```

2. **Permission Errors**
   - Use service role key, not anon key
   - Ensure proper database permissions

3. **Migration Already Applied**
   - Check status: `npm run migrate:status`
   - Migrations are idempotent

4. **Invalid Migration Format**
   - Use correct naming: `YYYYMMDDHHMMSS_name.sql`
   - Include `BEGIN;` and `COMMIT;`

### Debug Mode
```bash
DEBUG=true npm run migrate:up
```

## 🔐 Security Considerations

- **Service Role Key**: Only use for migrations, never anon key
- **Environment Variables**: Keep secure, never commit to version control
- **Backup**: Always backup before production migrations
- **Testing**: Test in development first

## 📚 Advanced Usage

### TypeScript Version
For better type safety:
```bash
npm run migrate:ts up
npm run migrate:ts create new_migration
npm run migrate:ts validate
```

### Manual Execution
```bash
node scripts/migrate.js up
node scripts/migrate.js status
node scripts/migrate.js create migration_name
```

### Environment-Specific Migrations
```sql
-- Only run in production
DO $$
BEGIN
    IF current_setting('app.environment') = 'production' THEN
        -- Production-specific SQL
    END IF;
END $$;
```

## 🎯 Best Practices

1. **Always Use Transactions**: Wrap SQL in `BEGIN;` and `COMMIT;`
2. **Use IF NOT EXISTS**: Prevents errors on re-runs
3. **Add Indexes**: Create indexes for foreign keys and queries
4. **Be Descriptive**: Use clear names and add comments
5. **Test Rollbacks**: Always create rollback files
6. **Version Control**: Commit migration files to git
7. **Backup First**: Always backup before production migrations

## 📞 Support

For detailed documentation, see:
- `database/MIGRATION_GUIDE.md` - Comprehensive usage guide
- `database/migration_functions.sql` - Database functions documentation

### Getting Help
1. Check the troubleshooting section
2. Validate migrations: `npm run migrate:validate`
3. Check status: `npm run migrate:status`
4. Review migration logs in Supabase dashboard

## 🎉 What's Next?

Your migration system is now ready! You can:

1. **Start Using**: Run `npm run migrate:up` to apply existing migrations
2. **Create New Features**: Use `npm run migrate:create feature_name`
3. **Manage Changes**: Use the status and rollback commands
4. **Scale Up**: Add more complex migrations as needed

The system is designed to grow with your project and handle complex database changes safely and efficiently.