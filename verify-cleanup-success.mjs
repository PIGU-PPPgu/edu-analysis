#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DELETED_TABLES = [
  'test_grades',
  'temp_grades', 
  'backup_grades',
  'temp_students'
];

async function checkTableDeleted(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error && (error.message.includes('does not exist') || 
                  error.message.includes('relation') && error.message.includes('does not exist'))) {
      return { deleted: true, error: null };
    }
    
    if (error) {
      return { deleted: false, error: error.message };
    }
    
    // If no error, table still exists
    return { deleted: false, error: null, rowCount: count || 0 };
    
  } catch (err) {
    if (err.message.includes('does not exist')) {
      return { deleted: true, error: null };
    }
    return { deleted: false, error: err.message };
  }
}

async function main() {
  console.log('🔍 Verifying Junk Table Cleanup Success');
  console.log('=======================================\n');
  
  const results = {
    successfully_deleted: [],
    still_exist: [],
    errors: []
  };
  
  for (const tableName of DELETED_TABLES) {
    console.log(`Checking '${tableName}'...`);
    
    const result = await checkTableDeleted(tableName);
    
    if (result.deleted) {
      console.log(`✅ '${tableName}' - Successfully deleted`);
      results.successfully_deleted.push(tableName);
    } else if (result.error) {
      console.log(`❌ '${tableName}' - Error: ${result.error}`);
      results.errors.push({ table: tableName, error: result.error });
    } else {
      console.log(`⚠️  '${tableName}' - Still exists (${result.rowCount || 0} rows)`);
      results.still_exist.push({ table: tableName, rows: result.rowCount || 0 });
    }
  }
  
  console.log('\n📊 CLEANUP VERIFICATION SUMMARY:');
  console.log('=================================');
  
  if (results.successfully_deleted.length > 0) {
    console.log(`✅ Successfully deleted: ${results.successfully_deleted.join(', ')}`);
  }
  
  if (results.still_exist.length > 0) {
    console.log(`⚠️  Still exist:`);
    results.still_exist.forEach(item => {
      console.log(`   - ${item.table}: ${item.rows} rows`);
    });
    console.log('\n   👉 Manual cleanup still required for remaining tables');
  }
  
  if (results.errors.length > 0) {
    console.log(`❌ Errors encountered:`);
    results.errors.forEach(item => {
      console.log(`   - ${item.table}: ${item.error}`);
    });
  }
  
  if (results.successfully_deleted.length === DELETED_TABLES.length) {
    console.log('\n🎉 ALL JUNK TABLES SUCCESSFULLY CLEANED UP!');
    console.log('   Your database is now free of the identified junk tables.');
  } else if (results.still_exist.length > 0) {
    console.log('\n🔧 NEXT STEPS:');
    console.log('   Please manually delete the remaining tables using:');
    console.log('   - Supabase Dashboard → Table Editor → Delete table');
    console.log('   - Or SQL Editor with DROP TABLE commands');
  }
  
  console.log('\n✨ Verification completed!');
}

main().catch(console.error);