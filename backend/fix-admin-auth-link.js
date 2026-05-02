import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixAdminAuthLink() {
  console.log('\n🔧 FIXING ADMIN AUTH LINK\n');
  
  try {
    // Get all auth users to find the correct one
    console.log('📋 Fetching auth users...');
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError);
      return;
    }

    // Find the admin auth user
    const adminAuthUser = authUsers.find(u => u.email === 'abanabaasa2@gmail.com');
    
    if (!adminAuthUser) {
      console.error('❌ No auth user found for abanabaasa2@gmail.com');
      console.log('Auth users found:');
      authUsers.forEach(u => console.log(`   - ${u.email} (${u.id})`));
      return;
    }

    console.log(`✅ Found auth user: ${adminAuthUser.email}`);
    console.log(`   Auth ID: ${adminAuthUser.id}`);

    // Update the database record with the correct auth_id
    console.log('\n📝 Updating database record...');
    const { error: updateError } = await supabase
      .from('users')
      .update({ auth_id: adminAuthUser.id })
      .eq('email', 'abanabaasa2@gmail.com')
      .eq('role', 'admin');

    if (updateError) {
      console.error('❌ Error updating database:', updateError);
      return;
    }

    console.log('✅ Database record updated successfully');

    // Verify the fix
    const { data: verifyUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'abanabaasa2@gmail.com')
      .eq('role', 'admin')
      .maybeSingle();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ ADMIN AUTH LINK FIXED!                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log('Updated Admin Record:');
    console.log(`📧 Email:      ${verifyUser.email}`);
    console.log(`🔑 Auth ID:    ${verifyUser.auth_id}`);
    console.log(`👤 Role:       ${verifyUser.role}`);
    console.log(`✅ Status:     Active & Verified\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixAdminAuthLink();
