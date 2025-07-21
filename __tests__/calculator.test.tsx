import { render, screen, fireEvent } from "@testing-library/react";
import { GlassRestorationCalculator } from "@/lib/calculations/services/glass-restoration";

describe("Glass Restoration Calculator", () => {
  test("calculates correct base price", () => {
    const calculator = new GlassRestorationCalculator();
    const result = calculator.calculate({
      glassArea: 240, // 10 windows
      buildingHeightStories: 2,
      numberOfDrops: 4,
      crewSize: 2,
      shiftLength: 8,
      location: "raleigh",
    });

    expect(result.basePrice).toBe(700); // 10 windows * $70
    expect(result.serviceType).toBe("GR");
  });

  test("validates minimum glass square footage", () => {
    const calculator = new GlassRestorationCalculator();

    expect(() => {
      calculator.calculate({
        glassArea: 0,
        buildingHeightStories: 1,
        numberOfDrops: 1,
        crewSize: 2,
        shiftLength: 8,
        location: "raleigh",
      });
    }).toThrow();
  });
});
