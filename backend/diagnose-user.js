// ============================================================
// DIAGNOSE USER ISSUE
// ============================================================

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  const email = "abanabaasa2@gmail.com";

  try {
    console.log("🔍 DIAGNOSING USER ISSUE...\n");

    // Check auth
    console.log("📋 Step 1: Checking auth.users...");
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const authUser = users.find(u => u.email === email);
    if (!authUser) {
      console.log("❌ User NOT found in auth.users");
      return;
    }
    console.log(`✅ Found in auth.users: ${authUser.id}`);

    // Check public.users
    console.log("\n📋 Step 2: Checking public.users...");
    const { data: dbUsers, error: dbError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (dbError) throw dbError;

    if (!dbUsers || dbUsers.length === 0) {
      console.log("❌ User NOT found in public.users");
      console.log("\n🔧 SOLUTION: Create user record in public.users");
      
      const { error: insertError } = await supabase
        .from("users")
        .insert({
          email: email,
          auth_id: authUser.id,
          role: "admin",
          is_active: true,
          email_verified: true,
        });

      if (insertError) throw insertError;
      console.log("✅ Created user record in public.users");
      return;
    }

    console.log(`✅ Found in public.users (${dbUsers.length} record(s))`);
    
    dbUsers.forEach((user, idx) => {
      console.log(`\nRecord ${idx + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Active: ${user.is_active}`);
      console.log(`  Email Verified: ${user.email_verified}`);
      console.log(`  Auth ID: ${user.auth_id}`);
    });

    // If multiple records, show which to keep
    if (dbUsers.length > 1) {
      console.log("\n⚠️  Multiple records found! Should have only 1");
    }

    // Verify role
    if (dbUsers[0].role !== "admin") {
      console.log("\n🔧 Fixing role to admin...");
      const { error: updateError } = await supabase
        .from("users")
        .update({ role: "admin" })
        .eq("email", email);

      if (updateError) throw updateError;
      console.log("✅ Role updated to admin");
    }

    console.log("\n✅ DIAGNOSIS COMPLETE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Test login with:");
    console.log(`  Email: ${email}`);
    console.log(`  Password: Nathan777`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

diagnose();
