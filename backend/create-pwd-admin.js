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

async function createAdminWithPassword() {
  console.log('🔐 Creating admin account with email/password...\n');
  
  try {
    // Create new user with password
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'abanabaasa2@gmail.com',
      password: 'Test123456',
      email_confirm: true,
      user_metadata: {
        full_name: 'abaasa aban',
        role: 'admin',
        phone: '+256758428461',
        department: 'Administration'
      }
    });
    
    if (error) {
      if (error.message.includes('already')) {
        console.log('⚠️  User already exists with Google OAuth');
        console.log('   The user account is linked to Google only.');
        console.log('\n📱 SOLUTION OPTIONS:');
        console.log('   1. Use Google Sign-in button on /admin-auth page');
        console.log('   2. Or delete existing account and create new one with password');
        return;
      }
      console.log('❌ Error:', error);
      return;
    }
    
    console.log('✅ Admin account created successfully!');
    console.log('   User ID:', data.user.id);
    console.log('\n📧 Email: abanabaasa2@gmail.com');
    console.log('🔑 Password: Test123456');
    console.log('\n✅ Admin can now login with these credentials!');
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

createAdminWithPassword().catch(console.error);
