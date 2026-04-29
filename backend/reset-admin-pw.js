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

async function resetPassword() {
  console.log('🔐 Resetting admin password...\n');
  
  try {
    const { data, error } = await supabase.auth.admin.updateUserById(
      '1e19cd1b-c8af-434e-8cd3-5a202e1fb07e',
      {
        password: 'Test123456',
        user_metadata: {
          password_reset: true
        }
      }
    );
    
    if (error) {
      console.log('❌ Direct password update failed:', error);
      console.log('\nTrying alternative method...');
      
      // Try sending password reset email instead
      const { data: resetData, error: resetError } = await supabase.auth.resetPasswordForEmail(
        'abanabaasa2@gmail.com'
      );
      
      if (resetError) {
        console.log('❌ Password reset email failed:', resetError);
      } else {
        console.log('✅ Password reset email sent!');
        console.log('   User should check their email for reset link');
      }
      return;
    }
    
    console.log('✅ Password set successfully!');
    console.log('\n📧 Email: abanabaasa2@gmail.com');
    console.log('🔑 Password: Test123456');
    console.log('\n✅ Admin can now login with these credentials!');
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

resetPassword().catch(console.error);
