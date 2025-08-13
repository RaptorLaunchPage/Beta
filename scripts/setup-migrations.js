#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these in your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupMigrations() {
  console.log('🚀 Setting up database migration system...\n');

  try {
    // Read the migration functions SQL file
    const functionsPath = path.join(__dirname, '..', 'database', 'migration_functions.sql');
    
    if (!fs.existsSync(functionsPath)) {
      console.error('❌ Migration functions file not found at:', functionsPath);
      process.exit(1);
    }

    const functionsSql = fs.readFileSync(functionsPath, 'utf8');
    
    console.log('📝 Installing migration functions...');
    
    // Execute the migration functions SQL
    const { error } = await supabase.rpc('execute_sql', {
      sql_query: functionsSql
    });

    if (error) {
      console.error('❌ Failed to install migration functions:', error);
      process.exit(1);
    }

    console.log('✅ Migration functions installed successfully');

    // Create the migration table
    console.log('📊 Creating migration tracking table...');
    
    const { error: tableError } = await supabase.rpc('create_migration_table', {
      table_name: 'schema_migrations'
    });

    if (tableError && !tableError.message.includes('already exists')) {
      console.error('❌ Failed to create migration table:', tableError);
      process.exit(1);
    }

    console.log('✅ Migration tracking table created');

    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('📁 Created migrations directory');
    }

    console.log('\n🎉 Migration system setup complete!');
    console.log('\nNext steps:');
    console.log('1. Create your first migration: npm run migrate:create initial_setup');
    console.log('2. Apply migrations: npm run migrate:up');
    console.log('3. Check status: npm run migrate:status');
    console.log('\nFor more information, see: database/MIGRATION_GUIDE.md');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ This script must be run from the project root directory');
  process.exit(1);
}

setupMigrations().catch(console.error);