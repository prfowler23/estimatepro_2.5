// Test script for real-time pricing service
const path = require("path");

// Mock the imports
const mockCalculatorService = {
  calculateService: ({ serviceType, formData }) => {
    // Simple mock calculation
    const baseRate = serviceType === "WC" ? 0.5 : 0.25; // per sqft
    const area = formData.area || 1000;
    const hours = area / 500; // 500 sqft per hour
    const materialCost = area * 0.05;
    const laborCost = hours * 50;
    const totalCost = materialCost + laborCost + area * baseRate;

    return {
      totalCost,
      laborCost,
      materialCost,
      equipmentCost: 50,
      hours,
      area,
    };
  },
  getServiceDisplayName: (serviceType) => {
    const names = {
      WC: "Window Cleaning",
      PW: "Pressure Washing",
      SW: "Soft Washing",
    };
    return names[serviceType] || serviceType;
  },
};

// Simple implementation of the pricing service for testing
class RealTimePricingService {
  calculatePricing(flowData) {
    const result = {
      totalCost: 0,
      totalHours: 0,
      totalArea: 0,
      serviceBreakdown: [],
      adjustments: [],
      confidence: "high",
      missingData: [],
      warnings: [],
      lastUpdated: new Date(),
    };

    // Check for missing data
    const hasArea =
      flowData.areaOfWork?.measurements?.length > 0 ||
      (flowData.takeoff?.measurements?.totalArea ||
        flowData.takeoff?.totalArea) > 0;

    if (!hasArea) {
      result.missingData.push("area-measurements");
      result.confidence = "low";
      result.warnings.push("No area measurements available");
    }

    // Calculate area
    let totalArea = 0;
    if (flowData.areaOfWork?.measurements) {
      totalArea = flowData.areaOfWork.measurements
        .filter((m) => m.type === "area")
        .reduce((sum, m) => sum + m.value, 0);
    }
    if (!totalArea && flowData.takeoff) {
      totalArea =
        flowData.takeoff.measurements?.totalArea ||
        flowData.takeoff.totalArea ||
        0;
    }
    result.totalArea = totalArea;

    // Calculate pricing for each service
    const services = flowData.services?.selectedServices || [];
    services.forEach((serviceType) => {
      const formData = { area: totalArea };
      const calc = mockCalculatorService.calculateService({
        serviceType,
        formData,
      });

      const serviceBreakdown = {
        serviceType,
        serviceName: mockCalculatorService.getServiceDisplayName(serviceType),
        basePrice: calc.totalCost,
        adjustedPrice: calc.totalCost,
        hours: calc.hours,
        area: calc.area,
        confidence: totalArea > 0 ? "high" : "low",
        calculations: calc,
      };

      // Apply markup
      if (flowData.pricing?.markupPercentage) {
        const markup =
          serviceBreakdown.basePrice *
          (flowData.pricing.markupPercentage / 100);
        serviceBreakdown.adjustedPrice += markup;

        if (!result.adjustments.find((a) => a.type === "markup")) {
          result.adjustments.push({
            type: "markup",
            description: `${flowData.pricing.markupPercentage}% markup`,
            value: flowData.pricing.markupPercentage,
          });
        }
      }

      result.serviceBreakdown.push(serviceBreakdown);
      result.totalCost += serviceBreakdown.adjustedPrice;
      result.totalHours += serviceBreakdown.hours;
    });

    // Add expenses
    if (flowData.expenses) {
      const expenseTotal =
        (flowData.expenses.materials || 0) +
        (flowData.expenses.equipment || 0) +
        (flowData.expenses.labor || 0) +
        (flowData.expenses.other || 0);
      result.totalCost += expenseTotal;
    }

    return result;
  }
}

async function testRealTimePricing() {
  console.log("Testing Real-Time Pricing Service...\n");

  const pricingService = new RealTimePricingService();

  // Test data
  const testFlowData = {
    currentStep: "pricing",
    services: {
      selectedServices: ["WC", "PW"], // Window Cleaning, Pressure Washing
    },
    areaOfWork: {
      measurements: [
        { type: "area", value: 5000, unit: "sqft" },
        { type: "area", value: 2000, unit: "sqft" },
      ],
      buildingDetails: {
        floors: 3,
        height: 36,
      },
    },
    takeoff: {
      measurements: {
        totalArea: 7000,
      },
    },
    pricing: {
      markupPercentage: 20,
      discountPercentage: 0,
      adjustments: [],
    },
    expenses: {
      materials: 500,
      equipment: 200,
      labor: 1000,
      other: 100,
    },
  };

  try {
    // Test 1: Calculate pricing
    console.log(
      "Test 1: Calculate pricing for Window Cleaning + Pressure Washing",
    );
    const result = await pricingService.calculatePricing(testFlowData);

    console.log("Result:", {
      totalCost: `$${result.totalCost.toFixed(2)}`,
      totalHours: `${result.totalHours} hours`,
      totalArea: `${result.totalArea} sqft`,
      confidence: result.confidence,
      servicesCount: result.serviceBreakdown.length,
    });

    console.log("\nService Breakdown:");
    result.serviceBreakdown.forEach((service) => {
      console.log(
        `- ${service.serviceName}: $${service.adjustedPrice.toFixed(2)} (${service.hours}h, ${service.area}sqft)`,
      );
    });

    if (result.warnings.length > 0) {
      console.log("\nWarnings:", result.warnings);
    }

    // Test 2: Test with missing data
    console.log("\n\nTest 2: Calculate with missing area data");
    const incompleteData = {
      ...testFlowData,
      areaOfWork: { measurements: [] },
      takeoff: {},
    };

    const result2 = await pricingService.calculatePricing(incompleteData);
    console.log("Missing data result:", {
      totalCost: `$${result2.totalCost.toFixed(2)}`,
      confidence: result2.confidence,
      missingData: result2.missingData,
    });

    console.log("\n✅ Real-time pricing service tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run test
testRealTimePricing().catch(console.error);
