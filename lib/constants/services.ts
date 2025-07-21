export const SERVICE_DEFINITIONS = {
  PW: {
    id: "PW",
    name: "Pressure Washing",
    description: "High-pressure water cleaning for building exteriors",
    basePrice: "$0.15-0.50/sq ft",
    typicalDuration: "1-3 days",
    requirements: ["Water access", "Proper drainage"],
    equipment: ["Pressure washer", "Hoses", "Surface cleaners"],
    safetyConsiderations: [
      "Fall protection",
      "Eye protection",
      "Non-slip footwear",
    ],
    bestFor: ["Concrete", "Brick", "Stone surfaces"],
    restrictions: ["Not suitable for delicate surfaces", "Weather dependent"],
  },
  PWS: {
    id: "PWS",
    name: "Pressure Wash & Seal",
    description: "Pressure washing followed by protective sealant application",
    basePrice: "$1.25-1.35/sq ft",
    typicalDuration: "3-5 days",
    requirements: ["Water access", "Dry weather for sealing"],
    equipment: ["Pressure washer", "Sealant applicators", "Sprayers"],
    safetyConsiderations: ["Chemical handling", "Ventilation", "PPE required"],
    bestFor: ["Concrete", "Natural stone", "Porous surfaces"],
    restrictions: ["Temperature sensitive", "Requires 48hr cure time"],
  },
  WC: {
    id: "WC",
    name: "Window Cleaning",
    description: "Professional window cleaning interior and/or exterior",
    basePrice: "$2-4/window",
    typicalDuration: "1-2 days",
    requirements: ["Window access"],
    equipment: ["Squeegees", "Cleaning solution", "Extension poles"],
    safetyConsiderations: ["Fall protection for heights", "Ladder safety"],
    bestFor: ["All window types", "Regular maintenance"],
    restrictions: ["Weather dependent", "Access limitations"],
  },
  GR: {
    id: "GR",
    name: "Glass Restoration",
    description:
      "Specialized restoration to remove stains, scratches, and oxidation from glass",
    basePrice: "$5-35/window",
    typicalDuration: "2-4 days",
    requirements: ["Specialized equipment", "Skilled technicians"],
    equipment: [
      "Glass polishing compounds",
      "Restoration tools",
      "Protective materials",
    ],
    safetyConsiderations: [
      "Chemical exposure protection",
      "Precision work safety",
    ],
    bestFor: ["Damaged glass", "Hard water stains", "Construction residue"],
    restrictions: ["Cannot repair all damage types", "Weather sensitive"],
  },
  FR: {
    id: "FR",
    name: "Frame Restoration",
    description: "Restoration and refinishing of window frames and trim",
    basePrice: "$25/frame",
    typicalDuration: "2-3 days",
    requirements: ["Access to frames", "Material preparation area"],
    equipment: [
      "Sanders",
      "Brushes",
      "Restoration chemicals",
      "Protective coatings",
    ],
    safetyConsiderations: [
      "Lead paint precautions",
      "Chemical handling",
      "Dust protection",
    ],
    bestFor: ["Metal frames", "Wood frames", "Oxidized surfaces"],
    restrictions: ["Historical preservation requirements", "Weather dependent"],
  },
  HD: {
    id: "HD",
    name: "High Dusting",
    description:
      "Removal of dust and debris from elevated surfaces and fixtures",
    basePrice: "$0.37-0.75/sq ft",
    typicalDuration: "1-2 days",
    requirements: ["Height access equipment", "Dust containment"],
    equipment: ["Extension tools", "Microfiber cloths", "Vacuum systems"],
    safetyConsiderations: [
      "Fall protection",
      "Respiratory protection",
      "Ladder safety",
    ],
    bestFor: ["Light fixtures", "Ceiling fans", "High shelving", "HVAC vents"],
    restrictions: ["Electrical safety concerns", "Delicate fixture handling"],
  },
  SW: {
    id: "SW",
    name: "Soft Washing",
    description: "Low-pressure chemical cleaning for delicate surfaces",
    basePrice: "$0.45/sq ft",
    typicalDuration: "1-2 days",
    requirements: ["Chemical mixing area", "Vegetation protection"],
    equipment: [
      "Low-pressure pumps",
      "Chemical applicators",
      "Protective sheeting",
    ],
    safetyConsiderations: [
      "Chemical handling",
      "Environmental protection",
      "PPE required",
    ],
    bestFor: ["Roofs", "Siding", "Delicate masonry", "Painted surfaces"],
    restrictions: ["Chemical runoff concerns", "Vegetation damage risk"],
  },
  PD: {
    id: "PD",
    name: "Parking Deck Cleaning",
    description: "Specialized cleaning of parking structures and decks",
    basePrice: "$16-23/space",
    typicalDuration: "2-4 days",
    requirements: ["Traffic control", "Drainage management"],
    equipment: [
      "Industrial pressure washers",
      "Floor scrubbers",
      "Degreasing agents",
    ],
    safetyConsiderations: [
      "Traffic management",
      "Slip hazards",
      "Chemical exposure",
    ],
    bestFor: ["Concrete decks", "Oil stain removal", "Structural maintenance"],
    restrictions: [
      "Traffic disruption",
      "Weather dependent",
      "Drainage requirements",
    ],
  },
  GRC: {
    id: "GRC",
    name: "Granite Reconditioning",
    description:
      "Restoration and polishing of granite and natural stone surfaces",
    basePrice: "$1.75/sq ft",
    typicalDuration: "2-3 days",
    requirements: ["Specialized stone care products", "Skilled technicians"],
    equipment: [
      "Diamond polishing pads",
      "Stone cleaners",
      "Sealers",
      "Polishing machines",
    ],
    safetyConsiderations: [
      "Silica dust protection",
      "Chemical handling",
      "Heavy equipment",
    ],
    bestFor: ["Granite facades", "Natural stone", "Marble surfaces"],
    restrictions: ["Stone type limitations", "Weather sensitive sealing"],
  },
  FC: {
    id: "FC",
    name: "Final Clean",
    description: "Comprehensive final cleaning and detail work",
    basePrice: "$70/hour",
    typicalDuration: "1 day",
    requirements: ["Access to all areas", "Quality control checklist"],
    equipment: [
      "Variety of cleaning tools",
      "Detailing supplies",
      "Touch-up materials",
    ],
    safetyConsiderations: ["Standard cleaning safety", "Area coordination"],
    bestFor: ["Project completion", "Quality assurance", "Client preparation"],
    restrictions: ["Scheduling dependent", "Weather considerations"],
  },
};

// Service categories for organization
export const SERVICE_CATEGORIES = {
  PRESSURE_CLEANING: {
    name: "Pressure Cleaning",
    services: ["PW", "PWS", "SW"],
    description: "High and low pressure cleaning services",
  },
  GLASS_SERVICES: {
    name: "Glass & Window Services",
    services: ["WC", "GR", "FR"],
    description: "Comprehensive window and glass care",
  },
  SPECIALIZED_CLEANING: {
    name: "Specialized Cleaning",
    services: ["HD", "PD", "GRC"],
    description: "Specialized cleaning for specific surfaces",
  },
  FINISHING_SERVICES: {
    name: "Finishing Services",
    services: ["FC"],
    description: "Final touches and quality assurance",
  },
};

// Service complexity levels
export const SERVICE_COMPLEXITY = {
  BASIC: ["WC", "HD", "FC"],
  INTERMEDIATE: ["PW", "SW", "PD"],
  ADVANCED: ["PWS", "GR", "FR", "GRC"],
};

// Equipment requirements by service
export const EQUIPMENT_REQUIREMENTS = {
  PRESSURE_EQUIPMENT: ["PW", "PWS", "PD"],
  CHEMICAL_HANDLING: ["PWS", "SW", "GR", "FR", "GRC"],
  HEIGHT_ACCESS: ["WC", "GR", "FR", "HD"],
  SPECIALIZED_TOOLS: ["GR", "FR", "GRC"],
};

// Typical service combinations
export const SERVICE_BUNDLES = {
  BASIC_MAINTENANCE: {
    name: "Basic Maintenance Package",
    services: ["PW", "WC"],
    description: "Essential cleaning for regular maintenance",
    discount: 0.05, // 5% discount
  },
  COMPLETE_RESTORATION: {
    name: "Complete Restoration Package",
    services: ["PWS", "GR", "FR", "WC", "FC"],
    description: "Full building restoration and protection",
    discount: 0.1, // 10% discount
  },
  GLASS_SPECIALIST: {
    name: "Glass Specialist Package",
    services: ["GR", "FR", "WC"],
    description: "Comprehensive glass and frame care",
    discount: 0.07, // 7% discount
  },
  PRESSURE_PLUS: {
    name: "Pressure Plus Package",
    services: ["PW", "HD", "WC", "FC"],
    description: "Pressure washing with detail work",
    discount: 0.06, // 6% discount
  },
};

// Helper function to get service by ID
export function getServiceById(id: string) {
  return SERVICE_DEFINITIONS[id as keyof typeof SERVICE_DEFINITIONS];
}

// Helper function to get all services in a category
export function getServicesByCategory(
  category: keyof typeof SERVICE_CATEGORIES,
) {
  return SERVICE_CATEGORIES[category].services.map((id) => getServiceById(id));
}

// Helper function to get services by complexity
export function getServicesByComplexity(
  complexity: keyof typeof SERVICE_COMPLEXITY,
) {
  return SERVICE_COMPLEXITY[complexity].map((id) => getServiceById(id));
}

// Helper function to check equipment requirements
export function getEquipmentRequirements(serviceIds: string[]) {
  const requirements = new Set<string>();

  Object.entries(EQUIPMENT_REQUIREMENTS).forEach(([equipment, services]) => {
    if (services.some((service) => serviceIds.includes(service))) {
      requirements.add(equipment);
    }
  });

  return Array.from(requirements);
}
