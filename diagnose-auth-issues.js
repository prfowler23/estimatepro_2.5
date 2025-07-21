const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

async function diagnoseAuthIssues() {
  console.log("🔍 EstimatePro Authentication Diagnostic");
  console.log("=========================================\n");

  // Phase 1: Environment Validation
  console.log("📋 Phase 1: Environment Validation");
  console.log("-----------------------------------");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Environment Variables:");
  console.log(
    `✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? "✅ Set" : "❌ Missing"}`,
  );

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("\\n❌ CRITICAL: Missing essential environment variables!");
    console.log("Please check your .env.local file contains:");
    console.log("- NEXT_PUBLIC_SUPABASE_URL");
    console.log("- NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return;
  }

  console.log(`\\nSupabase URL: ${supabaseUrl}`);

  // Phase 2: Supabase Connection Test
  console.log("\\n🔗 Phase 2: Supabase Connection Test");
  console.log("-------------------------------------");

  try {
    // Test with anon key (normal client)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    console.log("✅ Supabase client created successfully");

    // Test basic connectivity
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("count")
      .limit(1);
    if (error) {
      console.log(`⚠️ Database connection issue: ${error.message}`);
    } else {
      console.log("✅ Database connection working");
    }

    // Test auth service
    console.log("\\n🔐 Testing auth service...");
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();
    if (sessionError) {
      console.log(`⚠️ Auth service issue: ${sessionError.message}`);
    } else {
      console.log("✅ Auth service accessible");
      console.log(
        `Current session: ${sessionData.session ? "Active" : "None"}`,
      );
    }
  } catch (err) {
    console.log(`❌ Supabase connection failed: ${err.message}`);
    return;
  }

  // Phase 3: User Account Analysis
  console.log("\\n👥 Phase 3: User Account Analysis");
  console.log("----------------------------------");

  if (supabaseServiceKey) {
    try {
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);

      // Check for demo user
      console.log("\\n🎯 Checking for demo user (demo@estimatepro.com)...");
      const { data: demoUser, error: demoError } =
        await adminClient.auth.admin.listUsers();

      if (demoError) {
        console.log(`❌ Failed to list users: ${demoError.message}`);
      } else {
        const totalUsers = demoUser.users.length;
        console.log(`📊 Total users in system: ${totalUsers}`);

        const foundDemoUser = demoUser.users.find(
          (user) => user.email === "demo@estimatepro.com",
        );
        if (foundDemoUser) {
          console.log("✅ Demo user found!");
          console.log(`   ID: ${foundDemoUser.id}`);
          console.log(`   Email: ${foundDemoUser.email}`);
          console.log(
            `   Confirmed: ${foundDemoUser.email_confirmed_at ? "✅ Yes" : "❌ No"}`,
          );
          console.log(`   Created: ${foundDemoUser.created_at}`);

          // Check if profile exists
          const { data: profile, error: profileError } = await adminClient
            .from("profiles")
            .select("*")
            .eq("id", foundDemoUser.id)
            .single();

          if (profileError) {
            console.log(
              `⚠️ Demo user profile missing: ${profileError.message}`,
            );
          } else {
            console.log("✅ Demo user profile exists");
            console.log(`   Name: ${profile.full_name || "Not set"}`);
            console.log(`   Role: ${profile.role || "Not set"}`);
          }
        } else {
          console.log("❌ Demo user not found - this is likely the issue!");
        }

        // List all users for debugging
        if (totalUsers > 0) {
          console.log("\\n📋 All users in system:");
          demoUser.users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email} (ID: ${user.id})`);
            console.log(
              `      Confirmed: ${user.email_confirmed_at ? "✅" : "❌"}`,
            );
          });
        }
      }
    } catch (adminErr) {
      console.log(`❌ Admin operations failed: ${adminErr.message}`);
    }
  } else {
    console.log("⚠️ Skipping user analysis - no service role key");
  }

  // Phase 4: Authentication Flow Test
  console.log("\\n🧪 Phase 4: Authentication Flow Test");
  console.log("-------------------------------------");

  try {
    const testClient = createClient(supabaseUrl, supabaseAnonKey);

    // Test 1: Invalid login (should fail gracefully)
    console.log("\\n🔍 Test 1: Invalid login attempt...");
    const { data: invalidData, error: invalidError } =
      await testClient.auth.signInWithPassword({
        email: "nonexistent@example.com",
        password: "wrongpassword",
      });

    if (invalidError) {
      console.log(
        `✅ Invalid login properly rejected: ${invalidError.message}`,
      );
    } else {
      console.log("⚠️ Invalid login unexpectedly succeeded");
    }

    // Test 2: Demo user login (if exists)
    console.log("\\n🎯 Test 2: Demo user login attempt...");
    const { data: demoData, error: demoLoginError } =
      await testClient.auth.signInWithPassword({
        email: "demo@estimatepro.com",
        password: "demo123",
      });

    if (demoLoginError) {
      console.log(`❌ Demo login failed: ${demoLoginError.message}`);

      // Classify the error
      if (demoLoginError.message.includes("Invalid login credentials")) {
        console.log(
          "   💡 Issue: Demo user credentials are incorrect or user does not exist",
        );
      } else if (demoLoginError.message.includes("Email not confirmed")) {
        console.log("   💡 Issue: Demo user email needs confirmation");
      } else {
        console.log("   💡 Issue: Other authentication problem");
      }
    } else {
      console.log("✅ Demo login successful!");
      console.log(`   User ID: ${demoData.user?.id}`);
      console.log(`   Email: ${demoData.user?.email}`);

      // Sign out to clean up
      await testClient.auth.signOut();
    }
  } catch (testErr) {
    console.log(`❌ Authentication flow test failed: ${testErr.message}`);
  }

  // Phase 5: Database Policies Check
  console.log("\\n🔒 Phase 5: Database Policies Check");
  console.log("------------------------------------");

  try {
    const policyClient = createClient(supabaseUrl, supabaseAnonKey);

    // Test profiles table access (should require auth)
    const { data: profilesData, error: profilesError } = await policyClient
      .from("profiles")
      .select("*")
      .limit(1);

    if (
      profilesError &&
      profilesError.message.includes(
        "new row violates row-level security policy",
      )
    ) {
      console.log("✅ RLS policies working correctly (profiles protected)");
    } else if (profilesError) {
      console.log(`⚠️ Profiles table issue: ${profilesError.message}`);
    } else {
      console.log(
        "⚠️ Profiles table accessible without auth (RLS may be disabled)",
      );
    }

    // Test estimates table access
    const { data: estimatesData, error: estimatesError } = await policyClient
      .from("estimates")
      .select("count")
      .limit(1);

    if (estimatesError) {
      console.log(`✅ Estimates table protected: ${estimatesError.message}`);
    } else {
      console.log("✅ Estimates table accessible");
    }
  } catch (policyErr) {
    console.log(`❌ Database policies check failed: ${policyErr.message}`);
  }

  // Phase 6: Recommendations
  console.log("\\n💡 Phase 6: Recommendations");
  console.log("-----------------------------");

  console.log(
    "\\nBased on the diagnosis above, here are the likely issues and fixes:",
  );
  console.log("\\n1. **If demo user is missing:**");
  console.log("   - Run the fix script to create demo user");
  console.log("   - Or manually create user in Supabase dashboard");

  console.log("\\n2. **If demo user exists but login fails:**");
  console.log("   - Check if email confirmation is required");
  console.log("   - Verify password is correct (demo123)");
  console.log("   - Check RLS policies");

  console.log("\\n3. **If no users exist:**");
  console.log("   - Use signup flow to create first user");
  console.log("   - Check email confirmation settings");

  console.log("\\n4. **If connection issues:**");
  console.log("   - Verify environment variables");
  console.log("   - Check Supabase project is active");
  console.log("   - Check network connectivity");

  console.log("\\n🔧 Next Steps:");
  console.log("1. Run this diagnostic to identify specific issues");
  console.log("2. Use the fix script if demo user needs to be created");
  console.log("3. Test login again after fixes");

  console.log("\\n✅ Diagnostic complete!");
}

diagnoseAuthIssues().catch(console.error);
