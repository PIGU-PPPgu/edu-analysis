import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function safeCleanup() {
  console.log('🧹 Starting safe database cleanup...\n');
  
  const cleanupResults = {
    timestamp: new Date().toISOString(),
    tables_removed: [],
    tables_verified_empty: [],
    warnings: [],
    errors: []
  };

  // Tables confirmed safe to delete (empty and clearly junk)
  const definiteJunkTables = [
    'test_grades'
  ];

  // Tables that are likely safe to delete but need verification
  const probableJunkTables = [
    'temp_grades',
    'backup_grades', 
    'old_grades',
    'temp_students'
  ];

  // Verify junk tables are actually empty before deletion
  console.log('🔍 Verifying tables are empty before cleanup...\n');

  for (const tableName of [...definiteJunkTables, ...probableJunkTables]) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`❌ Error checking ${tableName}: ${error.message}`);
        cleanupResults.errors.push(`${tableName}: ${error.message}`);
        continue;
      }

      if (count === 0 || count === null) {
        console.log(`✅ ${tableName}: Empty (${count} rows) - Safe to delete`);
        cleanupResults.tables_verified_empty.push({
          name: tableName,
          row_count: count,
          category: definiteJunkTables.includes(tableName) ? 'definite_junk' : 'probable_junk'
        });
      } else {
        console.log(`⚠️  ${tableName}: Contains ${count} rows - NOT safe to delete`);
        cleanupResults.warnings.push(`${tableName} contains ${count} rows - skipped deletion`);
      }
    } catch (err) {
      console.log(`❌ Error accessing ${tableName}: ${err.message}`);
      cleanupResults.errors.push(`${tableName}: ${err.message}`);
    }
  }

  console.log('\n🗑️  Proceeding with safe deletions...\n');

  // Delete only confirmed empty junk tables
  const tablesToDelete = cleanupResults.tables_verified_empty
    .filter(table => table.row_count === 0 || table.row_count === null)
    .map(table => table.name);

  if (tablesToDelete.length === 0) {
    console.log('ℹ️  No tables identified for safe deletion.');
    return;
  }

  for (const tableName of tablesToDelete) {
    try {
      // For safety, we'll use SQL to drop tables since Supabase client doesn't have DROP TABLE
      console.log(`🗑️  Attempting to delete table: ${tableName}`);
      
      // Note: This requires service role key and appropriate permissions
      // In production, you might want to use Supabase SQL editor instead
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `DROP TABLE IF EXISTS "${tableName}";`
      });

      if (error) {
        console.log(`❌ Failed to delete ${tableName}: ${error.message}`);
        cleanupResults.errors.push(`Delete ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ Successfully deleted table: ${tableName}`);
        cleanupResults.tables_removed.push(tableName);
      }
    } catch (err) {
      console.log(`❌ Error deleting ${tableName}: ${err.message}`);
      cleanupResults.errors.push(`Delete ${tableName}: ${err.message}`);
    }
  }

  // Generate cleanup report
  const reportPath = './database-cleanup-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(cleanupResults, null, 2));

  console.log('\n📋 CLEANUP SUMMARY');
  console.log('==================');
  console.log(`Tables verified empty: ${cleanupResults.tables_verified_empty.length}`);
  console.log(`Tables successfully removed: ${cleanupResults.tables_removed.length}`);
  console.log(`Warnings: ${cleanupResults.warnings.length}`);
  console.log(`Errors: ${cleanupResults.errors.length}`);

  if (cleanupResults.tables_removed.length > 0) {
    console.log('\n✅ SUCCESSFULLY REMOVED:');
    cleanupResults.tables_removed.forEach(table => {
      console.log(`  - ${table}`);
    });
  }

  if (cleanupResults.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    cleanupResults.warnings.forEach(warning => {
      console.log(`  - ${warning}`);
    });
  }

  if (cleanupResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    cleanupResults.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }

  console.log(`\n📄 Detailed cleanup report saved to: ${reportPath}`);

  // Additional analysis recommendations
  console.log('\n🔍 NEXT STEPS RECOMMENDED:');
  console.log('1. Review grade_data vs grades table usage');
  console.log('2. Investigate empty core tables (class_info, subjects, etc.)');
  console.log('3. Consider normalizing grade_data structure');
  console.log('4. Update schema documentation to match reality');
  
  // Check for potential RLS issues
  console.log('\n🔒 SECURITY CHECK:');
  try {
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname')
      .eq('schemaname', 'public');
      
    if (!policyError && policies) {
      console.log(`Found ${policies.length} RLS policies configured`);
    }
  } catch (err) {
    console.log('Could not check RLS policies (may require service role key)');
  }
}

// Alternative safe cleanup function that just reports what would be deleted
async function dryRunCleanup() {
  console.log('🧪 DRY RUN: Database cleanup analysis...\n');
  
  const dryRunResults = {
    timestamp: new Date().toISOString(),
    would_delete: [],
    would_keep: [],
    needs_review: []
  };

  const tablesToCheck = [
    'test_grades', 'temp_grades', 'backup_grades', 'old_grades', 
    'temp_students', 'import_log', 'file_uploads'
  ];

  for (const tableName of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
        
      if (error) {
        console.log(`❌ Cannot access ${tableName}: ${error.message}`);
        continue;
      }

      if (count === 0 || count === null) {
        if (tableName.includes('test_') || tableName.includes('temp_') || tableName.includes('backup_')) {
          console.log(`🗑️  WOULD DELETE: ${tableName} (${count} rows, appears to be junk)`);
          dryRunResults.would_delete.push(tableName);
        } else {
          console.log(`⚠️  NEEDS REVIEW: ${tableName} (${count} rows, purpose unclear)`);
          dryRunResults.needs_review.push(tableName);
        }
      } else {
        console.log(`✅ WOULD KEEP: ${tableName} (${count} rows, contains data)`);
        dryRunResults.would_keep.push(tableName);
      }
    } catch (err) {
      console.log(`❌ Error checking ${tableName}: ${err.message}`);
    }
  }

  console.log('\n📋 DRY RUN SUMMARY:');
  console.log(`Would delete: ${dryRunResults.would_delete.length} tables`);
  console.log(`Would keep: ${dryRunResults.would_keep.length} tables`);
  console.log(`Need review: ${dryRunResults.needs_review.length} tables`);

  return dryRunResults;
}

// Check command line argument for dry run
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  dryRunCleanup().catch(console.error);
} else {
  console.log('⚠️  WARNING: This will actually delete tables!');
  console.log('Run with --dry-run flag first to see what would be deleted.');
  console.log('Proceeding in 3 seconds...\n');
  
  setTimeout(() => {
    safeCleanup().catch(console.error);
  }, 3000);
}