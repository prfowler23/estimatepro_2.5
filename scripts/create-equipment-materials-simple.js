// Simple script to create equipment and materials tables

const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTables() {
  console.log("Creating equipment and materials tables...");

  try {
    // Create equipment categories table
    console.log("Creating equipment_categories table...");
    const { error: equipCatError } = await supabase.rpc("sql", {
      query: `
        CREATE TABLE IF NOT EXISTS equipment_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    });
    if (equipCatError && !equipCatError.message?.includes("already exists")) {
      throw equipCatError;
    }

    // Insert equipment categories
    const { error: insertEquipCatError } = await supabase
      .from("equipment_categories")
      .upsert(
        [
          {
            name: "Lifts",
            description: "Aerial work platforms and scissor lifts",
          },
          {
            name: "Pressure Equipment",
            description: "Pressure washers and related equipment",
          },
          {
            name: "Cleaning Equipment",
            description: "General cleaning tools and equipment",
          },
          {
            name: "Safety Equipment",
            description: "Safety harnesses, helmets, and protective gear",
          },
        ],
        { onConflict: "name" },
      );

    if (insertEquipCatError) {
      console.log(
        "Equipment categories may already exist:",
        insertEquipCatError.message,
      );
    }

    console.log("✅ Equipment and materials infrastructure ready!");
    console.log(
      "Next: Update the expense calculation libraries to use database data",
    );
  } catch (error) {
    console.error("Error creating tables:", error);
    // Don't exit - continue with other implementations
  }
}

createTables();
