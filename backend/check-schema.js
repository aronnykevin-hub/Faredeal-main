import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  console.log('📊 Checking database schema...\n');
  
  try {
    // Try to query the information schema
    const { data, error } = await supabase
      .rpc('get_auth_users_count', {});
    
    if (error) {
      console.log('ℹ️  RPC not available:', error.message);
    }
    
    // Try to select from users table to see schema
    console.log('Step 1: Checking users table columns...');
    const { data: tableData, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(0);
    
    if (tableError) {
      console.log('❌ Error:', tableError.message);
      console.log('   Code:', tableError.code);
    } else {
      console.log('✅ Users table exists');
    }
    
    // List tables
    console.log('\nStep 2: Checking all tables in auth schema...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'auth');
    
    if (tablesError) {
      console.log('ℹ️  Cannot query information schema:', tablesError.message);
    } else if (tables) {
      console.log('✅ Tables in auth schema:');
      tables.forEach(t => console.log('   -', t.table_name));
    }
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

checkSchema().catch(console.error);
