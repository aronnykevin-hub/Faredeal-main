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

async function fixAdmin() {
  console.log('🔐 Fixing admin account for password login...\n');
  
  try {
    const userId = '1e19cd1b-c8af-434e-8cd3-5a202e1fb07e';
    const email = 'abanabaasa2@gmail.com';
    
    console.log('Step 1: Deleting existing OAuth account...');
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.log('❌ Delete error:', deleteError);
      return;
    }
    
    console.log('✅ OAuth account deleted\n');
    
    console.log('Step 2: Creating new admin account with password...');
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: 'Test123456',
      email_confirm: true,
      user_metadata: {
        full_name: 'abaasa aban',
        role: 'admin',
        phone: '+256758428461',
        department: 'Administration'
      }
    });
    
    if (createError) {
      console.log('❌ Create error:', createError);
      return;
    }
    
    console.log('✅ New admin account created!\n');
    console.log('═══════════════════════════════════════');
    console.log('📧 Email:    abanabaasa2@gmail.com');
    console.log('🔑 Password: Test123456');
    console.log('═══════════════════════════════════════\n');
    console.log('✅ Admin can now login with email and password!');
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

fixAdmin().catch(console.error);
