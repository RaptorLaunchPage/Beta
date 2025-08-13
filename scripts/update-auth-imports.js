#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Files to update - all TypeScript/JSX files except the auth files themselves
const patterns = [
  'app/**/*.{ts,tsx}',
  'components/**/*.{ts,tsx}',
  'hooks/**/*.{ts,tsx}',
  'lib/**/*.{ts,tsx}'
];

// Files to exclude
const excludePatterns = [
  '**/use-auth.tsx',
  '**/use-auth-v2.tsx', 
  '**/auth-flow.ts',
  '**/auth-flow-v2.ts',
  '**/route-guard.tsx',
  '**/route-guard-v2.tsx'
];

function shouldExcludeFile(filePath) {
  return excludePatterns.some(pattern => 
    filePath.includes(pattern.replace('**/', ''))
  );
}

function updateFileImports(filePath) {
  if (shouldExcludeFile(filePath)) {
    console.log(`⏭️  Skipping: ${filePath}`);
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let updated = content;
    let hasChanges = false;

    // Update useAuth import
    const useAuthPattern = /import\s*{\s*useAuth\s*}\s*from\s*['"@][@/]hooks\/use-auth['"]/g;
    if (useAuthPattern.test(content)) {
      updated = updated.replace(useAuthPattern, `import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'`);
      hasChanges = true;
    }

    // Update useAuth usage to useAuthV2 but alias it as useAuth for compatibility
    const useAuthUsagePattern = /const\s*{\s*([^}]+)\s*}\s*=\s*useAuth\(\)/g;
    const matches = [...content.matchAll(useAuthUsagePattern)];
    if (matches.length > 0) {
      // We're already handling this with the import alias above
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`📝 No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Auth Import Migration...\n');

  let totalFiles = 0;
  let updatedFiles = 0;

  for (const pattern of patterns) {
    try {
      const files = await glob(pattern, { 
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'] 
      });
      
      for (const file of files) {
        totalFiles++;
        if (updateFileImports(file)) {
          updatedFiles++;
        }
      }
    } catch (error) {
      console.error(`Error processing pattern ${pattern}:`, error.message);
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Files updated: ${updatedFiles}`);
  console.log(`Files unchanged: ${totalFiles - updatedFiles}`);
  
  if (updatedFiles > 0) {
    console.log('\n✅ Auth import migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the application to ensure everything works');
    console.log('2. Update any remaining manual imports if needed');
    console.log('3. Run the complete database schema setup');
    console.log('4. Deploy and monitor for any issues');
  } else {
    console.log('\n📝 No files needed updating.');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { updateFileImports };