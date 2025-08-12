/**
 * Mock Data Factories for EstimatePro Testing
 * Centralized mock data generation with realistic defaults
 */

import { faker } from "@faker-js/faker";

// User Mock Factory
export const createMockUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: faker.helpers.arrayElement(["admin", "user", "manager"]),
  avatar_url: faker.image.avatar(),
  phone: faker.phone.number(),
  company: faker.company.name(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  ...overrides,
});

// Estimate Mock Factory
export const createMockEstimate = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: `${faker.company.name()} Estimate`,
  description: faker.lorem.paragraph(),
  status: faker.helpers.arrayElement([
    "draft",
    "pending",
    "approved",
    "completed",
    "cancelled",
  ]),
  total_amount: faker.number.float({ min: 500, max: 10000, fractionDigits: 2 }),
  customer_name: faker.person.fullName(),
  customer_email: faker.internet.email(),
  customer_phone: faker.phone.number(),
  customer_address: faker.location.streetAddress(true),
  project_address: faker.location.streetAddress(true),
  services: [],
  notes: faker.lorem.sentences(2),
  valid_until: faker.date.future().toISOString(),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  created_by: faker.string.uuid(),
  ...overrides,
});

// Service Mock Factory
export const createMockService = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.helpers.arrayElement([
    "Window Cleaning",
    "Pressure Washing",
    "Soft Washing",
    "Glass Restoration",
    "Frame Restoration",
    "High Dusting",
    "Final Clean",
    "Granite Reconditioning",
    "Pressure Wash & Seal",
    "Parking Deck Cleaning",
    "Biofilm Removal",
  ]),
  type: faker.helpers.arrayElement([
    "window_cleaning",
    "pressure_washing",
    "soft_washing",
    "glass_restoration",
    "frame_restoration",
    "high_dusting",
    "final_clean",
    "granite_reconditioning",
    "pressure_wash_seal",
    "parking_deck",
    "biofilm_removal",
  ]),
  description: faker.lorem.sentence(),
  base_price: faker.number.float({ min: 50, max: 500, fractionDigits: 2 }),
  quantity: faker.number.int({ min: 1, max: 100 }),
  unit: faker.helpers.arrayElement([
    "sq_ft",
    "linear_ft",
    "window",
    "hour",
    "each",
  ]),
  rate: faker.number.float({ min: 1, max: 10, fractionDigits: 2 }),
  total: faker.number.float({ min: 100, max: 2000, fractionDigits: 2 }),
  markup_percentage: faker.number.float({
    min: 0.1,
    max: 0.5,
    fractionDigits: 2,
  }),
  difficulty_factor: faker.number.float({
    min: 0.8,
    max: 1.5,
    fractionDigits: 1,
  }),
  risk_factor: faker.number.float({ min: 1.0, max: 2.0, fractionDigits: 1 }),
  materials: [],
  equipment: [],
  labor_hours: faker.number.float({ min: 1, max: 8, fractionDigits: 1 }),
  ...overrides,
});

// Analytics Mock Factory
export const createMockAnalytics = (overrides = {}) => ({
  period: faker.helpers.arrayElement([
    "day",
    "week",
    "month",
    "quarter",
    "year",
  ]),
  total_estimates: faker.number.int({ min: 10, max: 100 }),
  active_estimates: faker.number.int({ min: 5, max: 50 }),
  completed_estimates: faker.number.int({ min: 20, max: 80 }),
  cancelled_estimates: faker.number.int({ min: 1, max: 10 }),
  revenue_this_period: faker.number.float({
    min: 5000,
    max: 50000,
    fractionDigits: 2,
  }),
  revenue_last_period: faker.number.float({
    min: 4000,
    max: 45000,
    fractionDigits: 2,
  }),
  conversion_rate: faker.number.float({
    min: 0.4,
    max: 0.8,
    fractionDigits: 2,
  }),
  average_estimate_value: faker.number.float({
    min: 1000,
    max: 5000,
    fractionDigits: 2,
  }),
  average_project_duration: faker.number.int({ min: 1, max: 30 }),
  customer_satisfaction: faker.number.float({
    min: 4.0,
    max: 5.0,
    fractionDigits: 1,
  }),
  repeat_customer_rate: faker.number.float({
    min: 0.2,
    max: 0.6,
    fractionDigits: 2,
  }),
  ...overrides,
});

// Facade Analysis Mock Factory
export const createMockFacadeAnalysis = (overrides = {}) => ({
  id: faker.string.uuid(),
  image_url: faker.image.url(),
  building_height: faker.number.float({ min: 10, max: 200, fractionDigits: 1 }),
  building_width: faker.number.float({ min: 20, max: 500, fractionDigits: 1 }),
  window_count: faker.number.int({ min: 5, max: 200 }),
  window_types: faker.helpers.arrayElements(
    [
      "single_hung",
      "double_hung",
      "casement",
      "awning",
      "sliding",
      "fixed",
      "bay",
      "bow",
    ],
    { min: 1, max: 3 },
  ),
  materials: faker.helpers.arrayElements(
    ["glass", "brick", "concrete", "metal", "wood", "stone", "vinyl", "stucco"],
    { min: 1, max: 4 },
  ),
  surface_area: faker.number.float({ min: 500, max: 50000, fractionDigits: 0 }),
  accessibility_level: faker.helpers.arrayElement([
    "easy",
    "moderate",
    "difficult",
    "extreme",
  ]),
  safety_concerns: faker.helpers.arrayElements(
    [
      "high_elevation",
      "heavy_traffic",
      "power_lines",
      "fragile_surfaces",
      "weather_exposure",
    ],
    { min: 0, max: 3 },
  ),
  confidence_score: faker.number.float({
    min: 0.7,
    max: 1.0,
    fractionDigits: 2,
  }),
  analysis_duration_ms: faker.number.int({ min: 1000, max: 5000 }),
  analysis_date: faker.date.recent().toISOString(),
  model_version: "v8.0",
  recommendations: faker.helpers.arrayElements(
    [
      "Professional cleaning recommended",
      "Consider protective coating",
      "Schedule during off-peak hours",
      "Use specialized equipment",
      "Weather-dependent timing required",
      "Multiple crew members needed",
    ],
    { min: 2, max: 4 },
  ),
  estimated_duration: faker.number.int({ min: 2, max: 16 }),
  estimated_cost_range: {
    min: faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }),
    max: faker.number.float({ min: 2500, max: 8000, fractionDigits: 2 }),
  },
  ...overrides,
});

// Material Mock Factory
export const createMockMaterial = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.helpers.arrayElement([
    "Glass Cleaner",
    "Soap Solution",
    "Squeegee",
    "Scrubber",
    "Extension Pole",
    "Pressure Washer",
    "Surface Cleaner",
    "Chemical Stripper",
    "Protective Sealant",
    "Microfiber Cloths",
    "Ladder",
    "Safety Harness",
    "Drop Cloths",
  ]),
  category: faker.helpers.arrayElement([
    "cleaning_solutions",
    "tools",
    "equipment",
    "safety",
    "consumables",
  ]),
  unit: faker.helpers.arrayElement(["bottle", "gallon", "each", "set", "roll"]),
  unit_cost: faker.number.float({ min: 5, max: 200, fractionDigits: 2 }),
  supplier: faker.company.name(),
  sku: faker.string.alphanumeric(8).toUpperCase(),
  in_stock: faker.datatype.boolean(),
  minimum_quantity: faker.number.int({ min: 1, max: 10 }),
  ...overrides,
});

// Equipment Mock Factory
export const createMockEquipment = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.helpers.arrayElement([
    "Pressure Washer 3000 PSI",
    "Extension Ladder 40ft",
    "Boom Lift 60ft",
    "Water Fed Pole System",
    "Hot Water Unit",
    'Surface Cleaner 24"',
    "Chemical Injector",
    "Hose Reel 200ft",
    "Safety Harness Kit",
  ]),
  type: faker.helpers.arrayElement([
    "pressure_washer",
    "ladder",
    "lift",
    "pole_system",
    "water_heater",
    "surface_cleaner",
    "injector",
    "hose_reel",
    "safety_equipment",
  ]),
  daily_rate: faker.number.float({ min: 25, max: 500, fractionDigits: 2 }),
  hourly_rate: faker.number.float({ min: 5, max: 75, fractionDigits: 2 }),
  available: faker.datatype.boolean(),
  maintenance_due: faker.date.future(),
  specifications: {
    psi: faker.helpers.maybe(() => faker.number.int({ min: 1500, max: 4000 })),
    gpm: faker.helpers.maybe(() => faker.number.int({ min: 2, max: 8 })),
    reach: faker.helpers.maybe(() => faker.number.int({ min: 20, max: 100 })),
    weight: faker.helpers.maybe(() => faker.number.int({ min: 10, max: 500 })),
  },
  ...overrides,
});

// AI Conversation Mock Factory
export const createMockAIConversation = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.lorem.words(3),
  messages: Array.from(
    { length: faker.number.int({ min: 2, max: 10 }) },
    () => ({
      id: faker.string.uuid(),
      role: faker.helpers.arrayElement(["user", "assistant"]),
      content: faker.lorem.paragraph(),
      timestamp: faker.date.recent().toISOString(),
    }),
  ),
  created_at: faker.date.past().toISOString(),
  updated_at: faker.date.recent().toISOString(),
  user_id: faker.string.uuid(),
  context_type: faker.helpers.arrayElement([
    "estimate_creation",
    "facade_analysis",
    "general_inquiry",
    "troubleshooting",
  ]),
  ...overrides,
});

// Weather Data Mock Factory
export const createMockWeatherData = (overrides = {}) => ({
  location: {
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    coordinates: {
      lat: faker.location.latitude(),
      lng: faker.location.longitude(),
    },
  },
  current: {
    temperature: faker.number.int({ min: 20, max: 100 }),
    humidity: faker.number.int({ min: 30, max: 90 }),
    wind_speed: faker.number.int({ min: 0, max: 30 }),
    wind_direction: faker.helpers.arrayElement([
      "N",
      "NE",
      "E",
      "SE",
      "S",
      "SW",
      "W",
      "NW",
    ]),
    conditions: faker.helpers.arrayElement([
      "clear",
      "partly_cloudy",
      "cloudy",
      "overcast",
      "light_rain",
      "heavy_rain",
      "snow",
      "fog",
    ]),
    visibility: faker.number.int({ min: 1, max: 10 }),
    uv_index: faker.number.int({ min: 1, max: 10 }),
  },
  forecast: Array.from({ length: 7 }, (_, index) => ({
    date: faker.date
      .soon({ days: index + 1 })
      .toISOString()
      .split("T")[0],
    high: faker.number.int({ min: 60, max: 85 }),
    low: faker.number.int({ min: 40, max: 65 }),
    conditions: faker.helpers.arrayElement([
      "sunny",
      "partly_cloudy",
      "cloudy",
      "rain",
      "thunderstorms",
    ]),
    precipitation_chance: faker.number.int({ min: 0, max: 100 }),
    work_suitable: faker.datatype.boolean(),
  })),
  ...overrides,
});

// Performance Metrics Mock Factory
export const createMockPerformanceMetrics = (overrides = {}) => ({
  timestamp: faker.date.recent().toISOString(),
  page_load_time: faker.number.int({ min: 500, max: 3000 }),
  api_response_time: faker.number.int({ min: 100, max: 1000 }),
  database_query_time: faker.number.int({ min: 50, max: 500 }),
  memory_usage: faker.number.int({ min: 50, max: 200 }), // MB
  cpu_usage: faker.number.float({ min: 10, max: 80, fractionDigits: 1 }), // %
  bundle_size: faker.number.int({ min: 1000, max: 5000 }), // KB
  lighthouse_score: {
    performance: faker.number.int({ min: 70, max: 100 }),
    accessibility: faker.number.int({ min: 80, max: 100 }),
    best_practices: faker.number.int({ min: 75, max: 100 }),
    seo: faker.number.int({ min: 85, max: 100 }),
  },
  core_web_vitals: {
    lcp: faker.number.int({ min: 1000, max: 3000 }), // ms
    fid: faker.number.int({ min: 10, max: 100 }), // ms
    cls: faker.number.float({ min: 0, max: 0.25, fractionDigits: 3 }),
  },
  ...overrides,
});

// Mock Factory Registry
export const mockFactories = {
  user: createMockUser,
  estimate: createMockEstimate,
  service: createMockService,
  analytics: createMockAnalytics,
  facadeAnalysis: createMockFacadeAnalysis,
  material: createMockMaterial,
  equipment: createMockEquipment,
  aiConversation: createMockAIConversation,
  weatherData: createMockWeatherData,
  performanceMetrics: createMockPerformanceMetrics,
};

// Batch Mock Generators
export const createMockList = <T>(
  factory: (overrides?: any) => T,
  count: number = 5,
  overrides: any = {},
): T[] => {
  return Array.from({ length: count }, () => factory(overrides));
};

// Realistic Dataset Generators
export const createRealisticEstimateDataset = (count: number = 10) => {
  return Array.from({ length: count }, (_, index) => {
    const services = createMockList(
      createMockService,
      faker.number.int({ min: 1, max: 5 }),
    );
    const totalAmount = services.reduce(
      (sum, service) => sum + service.total,
      0,
    );

    return createMockEstimate({
      title: `Project ${index + 1} - ${faker.company.name()}`,
      services,
      total_amount: totalAmount,
      status: faker.helpers.weightedArrayElement([
        { weight: 3, value: "draft" },
        { weight: 2, value: "pending" },
        { weight: 4, value: "approved" },
        { weight: 2, value: "completed" },
        { weight: 1, value: "cancelled" },
      ]),
    });
  });
};

// Export all factories
export * from "@faker-js/faker";
