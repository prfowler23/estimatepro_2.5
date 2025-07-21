import { SERVICE_RULES } from "@/lib/estimation/service-rules";
import { ServiceType } from "@/lib/types/estimate-types";

describe("Service Validation Rules", () => {
  test("PW always includes WC", () => {
    const result = SERVICE_RULES.validateServiceSelection([
      "PW",
    ] as ServiceType[]);
    expect(result.autoAddedServices).toContain("WC");
  });

  test("WC cannot exist without PW or PWS", () => {
    const result = SERVICE_RULES.validateServiceSelection([
      "WC",
    ] as ServiceType[]);
    expect(result.errors).toContain(
      "Window Cleaning requires either Pressure Washing or Pressure Wash & Seal",
    );
  });

  test("PWS must be before GR and FR", () => {
    const services: ServiceType[] = ["GR", "PWS", "FR"];
    const result = SERVICE_RULES.validateServiceSelection(services);
    expect(result.valid).toBe(true); // Order will be corrected
  });

  test("Parking Deck is independent", () => {
    const result = SERVICE_RULES.validateServiceSelection(["PD"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Empty service selection returns error", () => {
    const result = SERVICE_RULES.validateServiceSelection([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("At least one service must be selected");
  });

  test("PW and PWS together generates warning", () => {
    const result = SERVICE_RULES.validateServiceSelection(["PW", "PWS"]);
    expect(result.warnings).toContain(
      "Both PW and PWS selected - typically only one is needed",
    );
  });

  test("GR without FR suggests adding FR", () => {
    const result = SERVICE_RULES.validateServiceSelection(["GR"]);
    expect(result.warnings).toContain(
      "Consider adding FR - commonly done with GR",
    );
  });

  test("FR without GR suggests adding GR", () => {
    const result = SERVICE_RULES.validateServiceSelection(["FR"]);
    expect(result.warnings).toContain(
      "Consider adding GR - commonly done with FR",
    );
  });

  test("Multiple mandatory pairs work correctly", () => {
    const result = SERVICE_RULES.validateServiceSelection(["PW"]);
    expect(result.autoAddedServices).toContain("WC");
    expect(result.valid).toBe(true);
  });

  test("Valid service combination returns no errors", () => {
    const result = SERVICE_RULES.validateServiceSelection([
      "PWS",
      "GR",
      "FR",
      "WC",
    ]);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("Independent services work alone", () => {
    SERVICE_RULES.independentServices.forEach((service) => {
      const result = SERVICE_RULES.validateServiceSelection([
        service,
      ] as ServiceType[]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  test("Service order priority is respected", () => {
    const services: ServiceType[] = ["WC", "PW", "GR"];
    const result = SERVICE_RULES.validateServiceSelection(services);

    // Should suggest proper ordering
    expect(result.warnings.some((w) => w.includes("should be scheduled"))).toBe(
      true,
    );
  });

  test("Auto-added services are tracked correctly", () => {
    const result = SERVICE_RULES.validateServiceSelection(["PW"]);
    expect(result.autoAddedServices).toEqual(["WC"]);
    expect(result.autoAddedServices).toHaveLength(1);
  });

  test("Complex service combination validation", () => {
    const result = SERVICE_RULES.validateServiceSelection([
      "PWS",
      "GR",
      "FR",
      "WC",
      "HD",
      "FC",
    ]);
    expect(result.valid).toBe(true);
    // Should not auto-add anything since WC is already included
    expect(result.autoAddedServices).toHaveLength(0);
  });

  test("Sequence rules validation with proper order", () => {
    const result = SERVICE_RULES.validateServiceSelection([
      "PWS",
      "WC",
      "GR",
      "FR",
    ]);
    expect(result.valid).toBe(true);
    // Should have minimal warnings since order is correct
  });

  test("Sequence rules validation with wrong order", () => {
    const result = SERVICE_RULES.validateServiceSelection([
      "GR",
      "FR",
      "PWS",
      "WC",
    ]);
    expect(result.valid).toBe(true); // Still valid but with warnings
    expect(
      result.warnings.some((w) => w.includes("should be scheduled after")),
    ).toBe(true);
  });

  test("Service validation correctly auto-adds mandatory services", () => {
    // Test that our validation works with the exact service codes
    const result = SERVICE_RULES.validateServiceSelection([
      "PW",
    ] as ServiceType[]);
    // Should auto-add WC since PW requires Window Cleaning according to mandatory pairs
    expect(result.autoAddedServices).toHaveLength(1);
    expect(result.autoAddedServices).toContain("WC");
  });

  test("All service priorities are defined", () => {
    const allServices: ServiceType[] = [
      "PW",
      "PWS",
      "WC",
      "GR",
      "FR",
      "BF",
      "HD",
      "SW",
      "PD",
      "GRC",
      "FC",
    ];
    allServices.forEach((service) => {
      expect(SERVICE_RULES.serviceOrder[service]).toBeDefined();
      expect(SERVICE_RULES.serviceOrder[service].priority).toBeGreaterThan(0);
    });
  });

  test("Service combinations with recommendations", () => {
    // Test that common pairs generate appropriate suggestions
    const result = SERVICE_RULES.validateServiceSelection(["GR"]);
    expect(result.warnings).toContain(
      "Consider adding FR - commonly done with GR",
    );
  });

  test("Validation result structure is correct", () => {
    const result = SERVICE_RULES.validateServiceSelection(["PW"]);

    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("warnings");
    expect(result).toHaveProperty("autoAddedServices");

    expect(typeof result.valid).toBe("boolean");
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(Array.isArray(result.autoAddedServices)).toBe(true);
  });
});
