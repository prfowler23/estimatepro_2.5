const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function createExecSqlFunction() {
  try {
    console.log("🚀 Creating exec_sql function...");

    // Note: This needs to be created using Supabase SQL Editor directly
    const sql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text) 
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE sql;
        RETURN json_build_object('success', true);
      EXCEPTION
        WHEN OTHERS THEN
          RETURN json_build_object('success', false, 'error', SQLERRM);
      END;
      $$;
    `;

    console.log(`
    ⚠️  IMPORTANT: The exec_sql function cannot be created through the Supabase client.
    
    Please run the following SQL in your Supabase SQL Editor:
    
    ${sql}
    
    After creating the function, you can run the facade analysis migration.
    `);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

createExecSqlFunction();
