import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabase() {
  console.log('📊 Checking users table in database...\n');
  
  try {
    // Get all users from database
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, full_name')
      .limit(20);
    
    if (error) {
      console.log('❌ Error querying users:', error);
      return;
    }
    
    console.log(`Found ${data.length} users in database:\n`);
    data.forEach(u => {
      console.log(`- ${u.email} (Role: ${u.role}, Name: ${u.full_name || 'N/A'})`);
    });
    
    if (data.length === 0) {
      console.log('⚠️  No users in database - this might be why auth user creation fails!');
      console.log('\nThe auth system expects a corresponding database record.');
    }
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

checkDatabase().catch(console.error);
