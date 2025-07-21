// Script to populate equipment and materials tables with existing hardcoded data

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

// Equipment data from lib/expenses/equipment-database.ts
const EQUIPMENT_DATA = [
  {
    category: "Lifts",
    name: "19ft Scissor Lift",
    description: "Electric scissor lift for indoor use",
    dailyRate: 150,
    weeklyRate: 600,
    monthlyRate: 1800,
    specifications: {
      maxHeight: "19 feet",
      platformSize: '32" x 68"',
      weight: "2,300 lbs",
      powerSource: "Electric",
    },
  },
  {
    category: "Lifts",
    name: "26ft Scissor Lift",
    description: "Electric scissor lift for indoor/outdoor use",
    dailyRate: 200,
    weeklyRate: 800,
    monthlyRate: 2400,
    specifications: {
      maxHeight: "26 feet",
      platformSize: '32" x 68"',
      weight: "3,100 lbs",
      powerSource: "Electric",
    },
  },
  {
    category: "Pressure Equipment",
    name: "Hot Water Pressure Washer",
    description: "3000 PSI hot water pressure washer",
    dailyRate: 125,
    weeklyRate: 500,
    monthlyRate: 1500,
    specifications: {
      pressure: "3000 PSI",
      flowRate: "4 GPM",
      temperature: "Up to 200°F",
      fuelType: "Diesel",
    },
  },
  {
    category: "Pressure Equipment",
    name: "Cold Water Pressure Washer",
    description: "3500 PSI cold water pressure washer",
    dailyRate: 75,
    weeklyRate: 300,
    monthlyRate: 900,
    specifications: {
      pressure: "3500 PSI",
      flowRate: "4 GPM",
      powerSource: "Gas Engine",
    },
  },
  {
    category: "Safety Equipment",
    name: "Fall Protection Harness",
    description: "Full body safety harness with lanyard",
    dailyRate: 15,
    weeklyRate: 60,
    monthlyRate: 180,
    specifications: {
      weightCapacity: "400 lbs",
      standards: "ANSI/OSHA compliant",
    },
  },
];

// Materials data from lib/expenses/materials-database.ts
const MATERIALS_DATA = [
  {
    category: "Cleaning Chemicals",
    name: "Glass Cleaner Concentrate",
    description: "Professional strength glass cleaning concentrate",
    brand: "Unger",
    costPerUnit: 24.99,
    unitOfMeasure: "gallon",
    coverageRate: 2000, // sq ft per gallon when diluted
    dilutionRatio: "1:20",
    environmentalImpact: "low",
  },
  {
    category: "Cleaning Chemicals",
    name: "Pressure Washing Detergent",
    description: "Heavy-duty pressure washing detergent",
    brand: "Simple Green",
    costPerUnit: 89.99,
    unitOfMeasure: "gallon",
    coverageRate: 1500,
    dilutionRatio: "1:10",
    environmentalImpact: "low",
  },
  {
    category: "Restoration Materials",
    name: "Glass Restoration Compound",
    description: "Cerium oxide based glass restoration compound",
    brand: "Glass Savers",
    costPerUnit: 156.0,
    unitOfMeasure: "pound",
    coverageRate: 50, // sq ft per pound
    dilutionRatio: "concentrate",
    environmentalImpact: "medium",
  },
  {
    category: "Sealers & Coatings",
    name: "Concrete Sealer",
    description: "Penetrating concrete sealer",
    brand: "SealMaster",
    costPerUnit: 185.0,
    unitOfMeasure: "gallon",
    coverageRate: 200, // sq ft per gallon
    dilutionRatio: "ready-to-use",
    environmentalImpact: "medium",
  },
  {
    category: "Cleaning Chemicals",
    name: "Soft Wash Mix",
    description: "Sodium hypochlorite soft washing solution",
    brand: "SoftWash Systems",
    costPerUnit: 45.0,
    unitOfMeasure: "gallon",
    coverageRate: 800,
    dilutionRatio: "1:3",
    environmentalImpact: "high",
  },
];

// Vendors data
const EQUIPMENT_VENDORS = [
  {
    name: "United Rentals",
    contactEmail: "sales@unitedrentals.com",
    contactPhone: "1-800-UR-RENTS",
    website: "https://www.unitedrentals.com",
    rating: 4.2,
  },
  {
    name: "Sunbelt Rentals",
    contactEmail: "info@sunbeltrentals.com",
    contactPhone: "1-800-SUNBELT",
    website: "https://www.sunbeltrentals.com",
    rating: 4.0,
  },
  {
    name: "Home Depot Tool Rental",
    contactEmail: "toolrental@homedepot.com",
    contactPhone: "1-877-560-3759",
    website: "https://www.homedepot.com/c/tool_truck_rental",
    rating: 3.8,
  },
];

const MATERIALS_VENDORS = [
  {
    name: "Cleaning Supply Distributors",
    contactEmail: "sales@cleaningsupply.com",
    contactPhone: "1-800-CLEAN-99",
    rating: 4.5,
    minimumOrderAmount: 150.0,
    deliveryFee: 25.0,
    freeDeliveryThreshold: 500.0,
  },
  {
    name: "Professional Chemical Supply",
    contactEmail: "orders@prochemsupply.com",
    contactPhone: "1-888-PRO-CHEM",
    rating: 4.3,
    minimumOrderAmount: 200.0,
    deliveryFee: 35.0,
    freeDeliveryThreshold: 750.0,
  },
  {
    name: "Industrial Supply Company",
    contactEmail: "sales@industrialsupply.com",
    contactPhone: "1-800-INDUSTRY",
    rating: 4.1,
    minimumOrderAmount: 100.0,
    deliveryFee: 20.0,
    freeDeliveryThreshold: 400.0,
  },
];

// Competitor data from lib/pricing/market-analysis.ts
const COMPETITORS_DATA = [
  {
    region: "Raleigh-Durham",
    name: "Triangle Window Cleaning",
    tier: "standard",
    marketShare: 15.5,
    pricingMultiplier: 0.95,
    strengths: ["Local reputation", "Competitive pricing"],
    weaknesses: ["Limited technology", "Small team"],
  },
  {
    region: "Charlotte",
    name: "Queen City Cleaning Services",
    tier: "premium",
    marketShare: 22.3,
    pricingMultiplier: 1.15,
    strengths: ["High-end clientele", "Advanced equipment"],
    weaknesses: ["Higher prices", "Limited availability"],
  },
  {
    region: "Raleigh-Durham",
    name: "Budget Clean Pro",
    tier: "budget",
    marketShare: 28.1,
    pricingMultiplier: 0.75,
    strengths: ["Low prices", "Quick service"],
    weaknesses: ["Basic service quality", "High turnover"],
  },
];

async function populateDatabase() {
  console.log("Starting database population...");

  try {
    // Get category IDs
    const { data: equipmentCategories } = await supabase
      .from("equipment_categories")
      .select("id, name");

    const { data: materialsCategories } = await supabase
      .from("materials_categories")
      .select("id, name");

    const { data: regions } = await supabase
      .from("market_regions")
      .select("id, name");

    // Create lookup maps
    const equipmentCategoryMap = Object.fromEntries(
      equipmentCategories.map((cat) => [cat.name, cat.id]),
    );
    const materialsCategoryMap = Object.fromEntries(
      materialsCategories.map((cat) => [cat.name, cat.id]),
    );
    const regionMap = Object.fromEntries(
      regions.map((region) => [region.name, region.id]),
    );

    // Insert equipment vendors
    console.log("Inserting equipment vendors...");
    const { data: insertedEquipmentVendors } = await supabase
      .from("equipment_vendors")
      .insert(EQUIPMENT_VENDORS)
      .select("id, name");

    // Insert materials vendors
    console.log("Inserting materials vendors...");
    const { data: insertedMaterialsVendors } = await supabase
      .from("materials_vendors")
      .insert(MATERIALS_VENDORS)
      .select("id, name");

    // Insert equipment
    console.log("Inserting equipment...");
    const equipmentInserts = EQUIPMENT_DATA.map((item) => ({
      category_id: equipmentCategoryMap[item.category],
      name: item.name,
      description: item.description,
      daily_rate: item.dailyRate,
      weekly_rate: item.weeklyRate,
      monthly_rate: item.monthlyRate,
      specifications: item.specifications,
    }));

    const { data: insertedEquipment } = await supabase
      .from("equipment")
      .insert(equipmentInserts)
      .select("id, name");

    // Insert materials
    console.log("Inserting materials...");
    const materialsInserts = MATERIALS_DATA.map((item) => ({
      category_id: materialsCategoryMap[item.category],
      name: item.name,
      description: item.description,
      brand: item.brand,
      cost_per_unit: item.costPerUnit,
      unit_of_measure: item.unitOfMeasure,
      coverage_rate: item.coverageRate,
      dilution_ratio: item.dilutionRatio,
      environmental_impact_rating: item.environmentalImpact,
    }));

    const { data: insertedMaterials } = await supabase
      .from("materials")
      .insert(materialsInserts)
      .select("id, name");

    // Insert competitors
    console.log("Inserting competitors...");
    const competitorInserts = COMPETITORS_DATA.map((comp) => ({
      region_id: regionMap[comp.region],
      name: comp.name,
      tier: comp.tier,
      market_share: comp.marketShare,
      average_pricing_multiplier: comp.pricingMultiplier,
      strengths: comp.strengths,
      weaknesses: comp.weaknesses,
    }));

    const { data: insertedCompetitors } = await supabase
      .from("competitors")
      .insert(competitorInserts)
      .select("id, name");

    console.log("Database population completed successfully!");
    console.log(`Inserted:`);
    console.log(`- ${insertedEquipmentVendors?.length || 0} equipment vendors`);
    console.log(`- ${insertedMaterialsVendors?.length || 0} materials vendors`);
    console.log(`- ${insertedEquipment?.length || 0} equipment items`);
    console.log(`- ${insertedMaterials?.length || 0} materials`);
    console.log(`- ${insertedCompetitors?.length || 0} competitors`);
  } catch (error) {
    console.error("Error populating database:", error);
    process.exit(1);
  }
}

// Run the population script
populateDatabase();
