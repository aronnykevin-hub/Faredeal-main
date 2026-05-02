import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugAndFixPassword() {
  console.log('\n🔍 DEBUGGING ADMIN AUTH PASSWORD\n');
  
  try {
    // Get all auth users
    console.log('📋 Fetching all auth users...');
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError);
      return;
    }

    console.log(`Found ${authUsers.length} auth users:`);
    authUsers.forEach(u => {
      console.log(`   - ${u.email} (ID: ${u.id})`);
      console.log(`     Last Sign In: ${u.last_sign_in_at || 'Never'}`);
      console.log(`     Created: ${u.created_at}`);
    });

    // Find admin user
    const adminAuthUser = authUsers.find(u => u.email === 'abanabaasa2@gmail.com');
    
    if (!adminAuthUser) {
      console.error('\n❌ Admin auth user not found! Need to recreate it.');
      console.log('🔧 Recreating admin auth user...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'abanabaasa2@gmail.com',
        password: 'Test123456',
        email_confirm: true,
        user_metadata: {
          full_name: 'Admin User',
          role: 'admin'
        }
      });

      if (createError) {
        console.error('❌ Error creating auth user:', createError);
        return;
      }

      console.log('✅ Auth user created successfully');
      console.log(`   ID: ${newUser.user.id}`);
      console.log(`   Email: ${newUser.user.email}`);

      // Update database with new auth_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_id: newUser.user.id })
        .eq('email', 'abanabaasa2@gmail.com');

      if (updateError) {
        console.error('❌ Error updating database:', updateError);
      } else {
        console.log('✅ Database linked to new auth user');
      }
    } else {
      console.log('\n✅ Admin auth user found');
      console.log(`   ID: ${adminAuthUser.id}`);
      console.log(`   Email: ${adminAuthUser.email}`);
      console.log(`   Email Confirmed: ${adminAuthUser.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Try to reset password
      console.log('\n🔧 Resetting password...');
      const { error: resetError } = await supabase.auth.admin.updateUserById(
        adminAuthUser.id,
        {
          password: 'Test123456',
          email_confirm: true
        }
      );

      if (resetError) {
        console.error('❌ Error resetting password:', resetError);
      } else {
        console.log('✅ Password reset successfully');
      }
    }

    // Final verification
    console.log('\n✅ Testing login...');
    const { data: testLogin, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'abanabaasa2@gmail.com',
      password: 'Test123456'
    });

    if (loginError) {
      console.error('❌ Login still failing:', loginError.message);
    } else {
      console.log('✅ LOGIN TEST SUCCESSFUL!');
      console.log(`   Session ID: ${testLogin.session?.access_token?.substring(0, 20)}...`);
      console.log(`   User ID: ${testLogin.user?.id}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAndFixPassword();
