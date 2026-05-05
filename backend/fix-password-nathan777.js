// ============================================================
// RESET ADMIN PASSWORD TO Nathan777
// ============================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  console.error("Set these in your .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminPassword() {
  const email = "abanabaasa2@gmail.com";
  const newPassword = "Nathan777";

  try {
    console.log("🔄 Starting password reset...\n");

    // Step 1: Check current user in auth
    console.log("📋 Step 1: Checking auth user...");
    const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) throw getUserError;
    
    const authUser = users.find(u => u.email === email);
    if (!authUser) {
      console.log("❌ User not found in auth");
      process.exit(1);
    }
    console.log(`✅ Found auth user: ${authUser.id}`);

    // Step 2: Update password in auth
    console.log("\n📋 Step 2: Updating password in auth...");
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    );

    if (updateError) throw updateError;
    console.log("✅ Password updated in auth");

    // Step 3: Check database user record
    console.log("\n📋 Step 3: Checking database user record...");
    const { data: dbUser, error: selectError } = await supabase
      .from("users")
      .select("id, email, role, is_active, email_verified")
      .eq("email", email)
      .single();

    if (selectError) throw selectError;
    console.log("✅ Database user found:");
    console.log(`   Email: ${dbUser.email}`);
    console.log(`   Role: ${dbUser.role}`);
    console.log(`   Active: ${dbUser.is_active}`);
    console.log(`   Email Verified: ${dbUser.email_verified}`);

    // Step 4: Verify role is admin
    if (dbUser.role !== "admin") {
      console.log("\n⚠️  Role is not 'admin', updating...");
      const { error: updateRoleError } = await supabase
        .from("users")
        .update({ role: "admin", is_active: true, email_verified: true })
        .eq("email", email);

      if (updateRoleError) throw updateRoleError;
      console.log("✅ Role updated to admin");
    }

    // Step 5: Final verification
    console.log("\n📋 Step 4: Final verification...");
    const { data: finalUser, error: finalError } = await supabase
      .from("users")
      .select("id, email, role, is_active, email_verified")
      .eq("email", email)
      .single();

    if (finalError) throw finalError;

    console.log("\n✅ PASSWORD RESET COMPLETE!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Login Credentials:");
    console.log(`  Email: ${finalUser.email}`);
    console.log(`  Password: ${newPassword}`);
    console.log("\nDatabase Status:");
    console.log(`  Role: ${finalUser.role} ✅`);
    console.log(`  Active: ${finalUser.is_active} ✅`);
    console.log(`  Email Verified: ${finalUser.email_verified} ✅`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n📝 Next Steps:");
    console.log("1. Hard refresh browser: Ctrl+Shift+Delete (select all cache)");
    console.log("2. Clear browser console errors");
    console.log("3. Open Incognito window and try login");
    console.log("4. If Access Denied still appears, check browser console for errors");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixAdminPassword();
