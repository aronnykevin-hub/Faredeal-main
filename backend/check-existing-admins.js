import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAdmins() {
  console.log('👤 Checking existing users...\n');
  
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Error:', error);
      return;
    }
    
    console.log(`Found ${users.length} auth users:\n`);
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.email}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Metadata role: ${u.user_metadata?.role || 'none'}`);
      console.log(`   Email confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Find admin-like users
    const potentialAdmins = users.filter(u => 
      u.user_metadata?.role === 'admin' || 
      u.user_metadata?.department === 'Administration' ||
      u.email.includes('admin')
    );
    
    if (potentialAdmins.length > 0) {
      console.log('✅ Potential admin users:');
      potentialAdmins.forEach(u => {
        console.log(`   - ${u.email} (Role: ${u.user_metadata?.role})`);
      });
    }
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

checkAdmins().catch(console.error);
