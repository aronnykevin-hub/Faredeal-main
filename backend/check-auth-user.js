import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkUser() {
  console.log('🔐 Checking abanabaasa2@gmail.com in Supabase Auth...\n');
  
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Error:', error);
      return;
    }
    
    const user = users.find(u => u.email === 'abanabaasa2@gmail.com');
    
    if (!user) {
      console.log('❌ User not found in Auth');
      return;
    }
    
    console.log('✅ User found in Auth:');
    console.log('   Email:', user.email);
    console.log('   ID:', user.id);
    console.log('   Email confirmed:', user.email_confirmed_at ? 'Yes' : 'No');
    console.log('   Created:', new Date(user.created_at).toLocaleString());
    console.log('   Last sign in:', user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never');
    console.log('   User metadata:', JSON.stringify(user.user_metadata, null, 2));
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

checkUser().catch(console.error);
