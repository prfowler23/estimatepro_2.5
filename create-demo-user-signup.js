const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

async function createDemoUserViaSignup() {
  console.log("🔧 Creating Demo User via Signup Flow");
  console.log("====================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("❌ Missing environment variables");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log("👤 Creating demo user with signup...");

  try {
    const { data, error } = await supabase.auth.signUp({
      email: "demo@estimatepro.com",
      password: "demo123",
      options: {
        data: {
          full_name: "Demo User",
          company_name: "EstimatePro Demo",
        },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        console.log("✅ Demo user already exists!");
        console.log("The user is already in the system.");

        // Try to sign in to verify
        console.log("\\n🧪 Testing existing user login...");
        const { data: loginData, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: "demo@estimatepro.com",
            password: "demo123",
          });

        if (loginError) {
          console.log(`❌ Login failed: ${loginError.message}`);

          if (loginError.message.includes("Email not confirmed")) {
            console.log("\\n💡 The user exists but email needs confirmation.");
            console.log("\\n🔧 Solutions:");
            console.log("1. Check your email for confirmation link");
            console.log(
              "2. Or disable email confirmation in Supabase settings:",
            );
            console.log(
              "   - Go to Supabase Dashboard → Authentication → Settings",
            );
            console.log('   - Turn OFF "Enable email confirmations"');
            console.log("   - Save changes and try login again");
          }
        } else {
          console.log("🎉 Demo user login successful!");
          console.log(`   User ID: ${loginData.user.id}`);
          console.log(`   Email: ${loginData.user.email}`);
          await supabase.auth.signOut();
        }
      } else {
        console.log(`❌ Signup failed: ${error.message}`);

        if (error.message.includes("Signup is disabled")) {
          console.log("\\n💡 Signup is disabled in Supabase settings.");
          console.log("\\n🔧 To fix:");
          console.log(
            "1. Go to Supabase Dashboard → Authentication → Settings",
          );
          console.log('2. Enable "Enable sign ups"');
          console.log("3. Save and try again");
        }
      }
    } else {
      console.log("✅ Demo user created successfully!");
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   Email: ${data.user?.email}`);
      console.log(
        `   Confirmation required: ${data.user?.email_confirmed_at ? "No" : "Yes"}`,
      );

      if (!data.user?.email_confirmed_at) {
        console.log("\\n📧 Email confirmation required:");
        console.log("   - Check your email for confirmation link");
        console.log("   - Or disable email confirmation in Supabase Dashboard");
      } else {
        console.log("\\n🧪 Testing login...");
        const { data: loginData, error: loginError } =
          await supabase.auth.signInWithPassword({
            email: "demo@estimatepro.com",
            password: "demo123",
          });

        if (loginError) {
          console.log(`❌ Login test failed: ${loginError.message}`);
        } else {
          console.log("🎉 Login test successful!");
          await supabase.auth.signOut();
        }
      }
    }
  } catch (err) {
    console.log(`❌ Unexpected error: ${err.message}`);
  }

  console.log("\\n📋 Next Steps:");
  console.log("1. If email confirmation is required, check your email");
  console.log("2. Or disable email confirmation in Supabase Dashboard");
  console.log("3. Run the diagnostic again: node diagnose-auth-issues.js");
  console.log("4. Try login in your application");

  console.log("\\n🔗 Supabase Dashboard URL:");
  console.log(
    `   ${supabaseUrl.replace("/rest/v1", "")}/project/default/auth/users`,
  );
}

createDemoUserViaSignup().catch(console.error);
