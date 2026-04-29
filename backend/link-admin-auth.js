import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function findAndLinkAdminAuth() {
  console.log('\n🔍 FINDING AUTH USERS AND LINKING ADMIN\n');
  
  try {
    // Get all auth users
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError);
      return;
    }

    console.log(`📊 Total auth users: ${authUsers.length}\n`);
    console.log('═══════════════════════════════════════════════════════════════');

    // Display all auth users
    authUsers.forEach(authUser => {
      console.log(`\n👤 Auth User:`);
      console.log(`   ID: ${authUser.id}`);
      console.log(`   Email: ${authUser.email || 'No email'}`);
      console.log(`   Created: ${new Date(authUser.created_at).toLocaleString()}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');

    // Find auth user matching admin email
    const adminEmail = 'abanabaasa2@gmail.com';
    const matchingAuthUser = authUsers.find(u => u.email === adminEmail);

    if (matchingAuthUser) {
      console.log(`\n✅ Found matching auth user for ${adminEmail}`);
      console.log(`   Auth ID: ${matchingAuthUser.id}`);
      console.log(`   Confirmed: ${matchingAuthUser.email_confirmed_at ? '✅ Yes' : '❌ No'}`);
      
      // Now update the users table
      console.log('\n📝 Updating admin user record...');
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ auth_id: matchingAuthUser.id })
        .eq('email', adminEmail);

      if (updateError) {
        console.error('❌ Error updating admin user:', updateError);
        console.log('   Error details:', updateError.message);
      } else {
        console.log('✅ Admin user successfully linked to auth user!');
        
        // Verify the link
        console.log('\n🔍 Verifying the link...');
        const { data: verifiedUser, error: verifyError } = await supabase
          .from('users')
          .select('*')
          .eq('email', adminEmail)
          .maybeSingle();
        
        if (verifyError) {
          console.error('❌ Error verifying:', verifyError);
        } else if (verifiedUser) {
          console.log('✅ Verification successful!');
          console.log(`   ID: ${verifiedUser.id}`);
          console.log(`   Email: ${verifiedUser.email}`);
          console.log(`   Role: ${verifiedUser.role}`);
          console.log(`   Auth ID: ${verifiedUser.auth_id}`);
          console.log(`   Active: ${verifiedUser.is_active}`);
          
          console.log('\n╔════════════════════════════════════════════════════════════╗');
          console.log('║              ✅ ADMIN AUTH LINK COMPLETE!                  ║');
          console.log('╚════════════════════════════════════════════════════════════╝\n');
          console.log('Next steps:');
          console.log('1. Logout from the admin portal (if logged in)');
          console.log('2. Clear browser cache: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
          console.log('3. Login again with:');
          console.log(`   📧 Email: ${adminEmail}`);
          console.log('   🔐 Password: Test123456');
          console.log('\n✅ You should now have full admin access!\n');
        }
      }
    } else {
      console.log(`\n⚠️ No auth user found with email: ${adminEmail}`);
      console.log('\n📋 ACTION REQUIRED:');
      console.log('────────────────────────────────────────────────────────────');
      console.log('The auth user needs to be created first:');
      console.log('1. Go to Supabase Dashboard');
      console.log('2. Authentication → Users');
      console.log('3. Click "Create New User"');
      console.log(`4. Email: ${adminEmail}`);
      console.log('5. Password: Test123456');
      console.log('6. Check "Auto confirm user"');
      console.log('7. Click Create User');
      console.log('8. Then run this script again to link them');
      console.log('────────────────────────────────────────────────────────────');
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
  }
}

findAndLinkAdminAuth().catch(console.error);
