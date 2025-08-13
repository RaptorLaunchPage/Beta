#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, '..', 'database', 'migrations');
const MIGRATION_TABLE = 'schema_migrations';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class MigrationManager {
  constructor() {
    this.migrations = [];
    this.loadMigrations();
  }

  loadMigrations() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    this.migrations = files.map(file => {
      const match = file.match(/^(\d{14})_(.+?)\.sql$/);
      if (!match) {
        console.warn(`⚠️  Skipping invalid migration file: ${file}`);
        return null;
      }
      return {
        id: match[1],
        name: match[2],
        file: file,
        path: path.join(MIGRATIONS_DIR, file)
      };
    }).filter(Boolean);
  }

  async ensureMigrationTable() {
    const { error } = await supabase.rpc('create_migration_table', {
      table_name: MIGRATION_TABLE
    });

    if (error && !error.message.includes('already exists')) {
      console.error('❌ Failed to create migration table:', error);
      throw error;
    }
  }

  async getAppliedMigrations() {
    const { data, error } = await supabase
      .from(MIGRATION_TABLE)
      .select('migration_id')
      .order('migration_id');

    if (error) {
      console.error('❌ Failed to get applied migrations:', error);
      throw error;
    }

    return data.map(row => row.migration_id);
  }

  async applyMigration(migration) {
    console.log(`🔄 Applying migration: ${migration.name} (${migration.id})`);
    
    const sql = fs.readFileSync(migration.path, 'utf8');
    
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: sql
    });

    if (error) {
      console.error(`❌ Failed to apply migration ${migration.name}:`, error);
      throw error;
    }

    // Record the migration as applied
    const { error: insertError } = await supabase
      .from(MIGRATION_TABLE)
      .insert({
        migration_id: migration.id,
        name: migration.name,
        applied_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(`❌ Failed to record migration ${migration.name}:`, insertError);
      throw insertError;
    }

    console.log(`✅ Applied migration: ${migration.name}`);
  }

  async rollbackMigration(migration) {
    console.log(`🔄 Rolling back migration: ${migration.name} (${migration.id})`);
    
    // Read the rollback SQL (if it exists)
    const rollbackPath = migration.path.replace('.sql', '_rollback.sql');
    
    if (!fs.existsSync(rollbackPath)) {
      console.warn(`⚠️  No rollback file found for ${migration.name}, skipping`);
      return;
    }

    const sql = fs.readFileSync(rollbackPath, 'utf8');
    
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: sql
    });

    if (error) {
      console.error(`❌ Failed to rollback migration ${migration.name}:`, error);
      throw error;
    }

    // Remove the migration record
    const { error: deleteError } = await supabase
      .from(MIGRATION_TABLE)
      .delete()
      .eq('migration_id', migration.id);

    if (deleteError) {
      console.error(`❌ Failed to remove migration record ${migration.name}:`, deleteError);
      throw deleteError;
    }

    console.log(`✅ Rolled back migration: ${migration.name}`);
  }

  async migrate(target = 'latest') {
    try {
      await this.ensureMigrationTable();
      const appliedMigrations = await this.getAppliedMigrations();

      if (target === 'latest') {
        // Apply all pending migrations
        const pendingMigrations = this.migrations.filter(
          m => !appliedMigrations.includes(m.id)
        );

        if (pendingMigrations.length === 0) {
          console.log('✅ Database is up to date');
          return;
        }

        console.log(`🔄 Applying ${pendingMigrations.length} pending migrations...`);
        
        for (const migration of pendingMigrations) {
          await this.applyMigration(migration);
        }

        console.log('✅ All migrations applied successfully');
      } else if (target === 'rollback') {
        // Rollback the last migration
        const lastApplied = appliedMigrations[appliedMigrations.length - 1];
        
        if (!lastApplied) {
          console.log('✅ No migrations to rollback');
          return;
        }

        const migration = this.migrations.find(m => m.id === lastApplied);
        if (!migration) {
          console.error(`❌ Migration ${lastApplied} not found in migration files`);
          return;
        }

        await this.rollbackMigration(migration);
        console.log('✅ Rollback completed');
      } else {
        console.error('❌ Invalid target. Use "latest" or "rollback"');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  async status() {
    try {
      await this.ensureMigrationTable();
      const appliedMigrations = await this.getAppliedMigrations();

      console.log('\n📊 Migration Status:');
      console.log('==================');

      for (const migration of this.migrations) {
        const isApplied = appliedMigrations.includes(migration.id);
        const status = isApplied ? '✅ Applied' : '⏳ Pending';
        console.log(`${status} ${migration.id} - ${migration.name}`);
      }

      const pendingCount = this.migrations.filter(
        m => !appliedMigrations.includes(m.id)
      ).length;

      console.log(`\n📈 Summary: ${this.migrations.length} total, ${appliedMigrations.length} applied, ${pendingCount} pending`);
    } catch (error) {
      console.error('❌ Failed to get migration status:', error);
      process.exit(1);
    }
  }

  createMigration(name) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const filename = `${timestamp}_${name}.sql`;
    const filepath = path.join(MIGRATIONS_DIR, filename);

    const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Description: 

-- Up migration
BEGIN;

-- Add your SQL here
-- Example:
-- CREATE TABLE IF NOT EXISTS example_table (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     name TEXT NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

COMMIT;
`;

    fs.writeFileSync(filepath, template);
    console.log(`✅ Created migration: ${filename}`);
    console.log(`📝 Edit the file at: ${filepath}`);
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  const manager = new MigrationManager();

  switch (command) {
    case 'up':
    case 'migrate':
      await manager.migrate('latest');
      break;
    
    case 'down':
    case 'rollback':
      await manager.migrate('rollback');
      break;
    
    case 'status':
      await manager.status();
      break;
    
    case 'create':
      if (!arg) {
        console.error('❌ Please provide a migration name');
        console.error('Usage: node migrate.js create <migration_name>');
        process.exit(1);
      }
      manager.createMigration(arg);
      break;
    
    case 'help':
    default:
      console.log(`
🔄 Database Migration Tool

Usage:
  node migrate.js <command> [options]

Commands:
  up, migrate          Apply all pending migrations
  down, rollback       Rollback the last migration
  status               Show migration status
  create <name>        Create a new migration file
  help                 Show this help message

Examples:
  node migrate.js up
  node migrate.js down
  node migrate.js status
  node migrate.js create add_user_table

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL      Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY     Your Supabase service role key
      `);
      break;
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch(console.error);