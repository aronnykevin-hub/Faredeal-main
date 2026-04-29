import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createMinimalUser() {
  console.log('🔐 Creating admin with minimal data...\n');
  
  try {
    // Try with absolute minimum
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'abanabaasa2@gmail.com',
      password: 'Test123456',
      email_confirm: true
    });
    
    if (error) {
      console.log('❌ Error:', error);
      console.log('\n🔍 The Supabase server is returning a 500 error.');
      console.log('This usually means:');
      console.log('  - Database trigger is failing');
      console.log('  - RLS policies are misconfigured');
      console.log('  - Auth function has an issue\n');
      
      console.log('📋 WORKAROUND: Restore from backup or check Supabase logs');
      return;
    }
    
    console.log('✅ User created!', data.user.id);
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

createMinimalUser().catch(console.error);
