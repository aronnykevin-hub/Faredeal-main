import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixAdminPassword() {
  console.log('🔐 Setting password for admin account...\n');
  
  try {
    // Update user with new password
    const { data, error } = await supabase.auth.admin.updateUserById(
      '1e19cd1b-c8af-434e-8cd3-5a202e1fb07e',
      { password: 'Test123456' }
    );
    
    if (error) {
      console.log('❌ Error updating password:', error.message);
      return;
    }
    
    console.log('✅ Password updated successfully!');
    console.log('\n📧 Email: abanabaasa2@gmail.com');
    console.log('🔑 Password: Test123456');
    console.log('\n✅ Admin can now login with these credentials!');
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

fixAdminPassword().catch(console.error);
