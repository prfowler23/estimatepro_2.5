const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

async function confirmDemoUser() {
  console.log("📧 Confirming Demo User Email");
  console.log("============================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log("❌ Missing environment variables (need service role key)");
    console.log("\\n🔧 Alternative solutions:");
    console.log("1. Disable email confirmation in Supabase Dashboard:");
    console.log(
      "   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/settings",
    );
    console.log('   - Turn OFF "Enable email confirmations"');
    console.log("   - Save changes");
    console.log("\\n2. Or manually confirm the user in Supabase Dashboard:");
    console.log(
      "   - Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/users",
    );
    console.log("   - Find demo@estimatepro.com");
    console.log("   - Click on the user and confirm their email");
    return;
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const regularClient = createClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  try {
    // Find the demo user
    console.log("🔍 Finding demo user...");
    const { data: users, error: listError } =
      await adminClient.auth.admin.listUsers();

    if (listError) {
      console.log(`❌ Cannot list users: ${listError.message}`);
      console.log("Service role key may not have sufficient permissions.");
      console.log(
        "\\n🔧 Manual confirmation required - see instructions above.",
      );
      return;
    }

    const demoUser = users.users.find(
      (user) => user.email === "demo@estimatepro.com",
    );

    if (!demoUser) {
      console.log("❌ Demo user not found");
      return;
    }

    console.log(`✅ Found demo user: ${demoUser.id}`);
    console.log(
      `   Email confirmed: ${demoUser.email_confirmed_at ? "Yes" : "No"}`,
    );

    if (demoUser.email_confirmed_at) {
      console.log("✅ Demo user email is already confirmed!");
    } else {
      console.log("📧 Confirming demo user email...");

      const { data: updateData, error: updateError } =
        await adminClient.auth.admin.updateUserById(demoUser.id, {
          email_confirm: true,
        });

      if (updateError) {
        console.log(`❌ Failed to confirm email: ${updateError.message}`);
      } else {
        console.log("✅ Demo user email confirmed successfully!");
      }
    }

    // Test login
    console.log("\\n🧪 Testing demo login...");
    const { data: loginData, error: loginError } =
      await regularClient.auth.signInWithPassword({
        email: "demo@estimatepro.com",
        password: "demo123",
      });

    if (loginError) {
      console.log(`❌ Login still failing: ${loginError.message}`);
    } else {
      console.log("🎉 Demo login successful!");
      console.log(`   User ID: ${loginData.user.id}`);
      console.log(`   Email: ${loginData.user.email}`);

      // Check/create profile
      const { data: profile, error: profileError } = await regularClient
        .from("profiles")
        .select("*")
        .eq("id", loginData.user.id)
        .single();

      if (profileError && profileError.code === "PGRST116") {
        console.log("📋 Creating user profile...");

        const { error: insertError } = await regularClient
          .from("profiles")
          .insert({
            id: loginData.user.id,
            full_name: "Demo User",
            email: "demo@estimatepro.com",
            role: "admin",
            company_name: "EstimatePro Demo",
          });

        if (insertError) {
          console.log(`⚠️ Profile creation failed: ${insertError.message}`);
        } else {
          console.log("✅ User profile created");
        }
      } else if (profileError) {
        console.log(`⚠️ Profile check failed: ${profileError.message}`);
      } else {
        console.log("✅ User profile exists");
      }

      // Sign out
      await regularClient.auth.signOut();
      console.log("✅ Test complete - signed out");
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log("\\n🎯 Final Steps:");
  console.log("1. Try logging in to your application with:");
  console.log("   Email: demo@estimatepro.com");
  console.log("   Password: demo123");
  console.log("\n2. If it still doesn't work, run diagnostic:");
  console.log("   node diagnose-auth-issues.js");
}

confirmDemoUser().catch(console.error);
