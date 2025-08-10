import {
  MeasurementEntry,
  MeasurementCategory,
} from "@/lib/types/measurements";
import {
  generateUniqueId,
  sanitizeInput,
  parseNumber,
  calculateArea,
  convertToSquareFeet,
} from "./utils";
import { ImportError, ParseError, FileFormatError } from "./errors";

export class TakeoffImportService {
  // Import from photo analysis (Step 3)
  importFromPhotoAnalysis(analysisData: any): MeasurementEntry[] {
    const entries: MeasurementEntry[] = [];

    // Convert window detection to measurements
    if (analysisData.windows) {
      analysisData.windows.locations.forEach((window: any, index: number) => {
        entries.push({
          id: generateUniqueId(),
          category: "glass_windows",
          description: `Window ${index + 1}`,
          location: `Grid position ${window.gridPosition}`,
          width: window.width || 3, // Default 3ft
          height: window.height || 5, // Default 5ft
          quantity: 1,
          unit: "sqft",
          total: (window.width || 3) * (window.height || 5),
        });
      });
    }

    // Convert door detection to measurements
    if (analysisData.doors) {
      analysisData.doors.locations.forEach((door: any, index: number) => {
        entries.push({
          id: generateUniqueId(),
          category: "glass_doors",
          description: `Door ${index + 1}`,
          location: `Grid position ${door.gridPosition}`,
          width: door.width || 3, // Default 3ft
          height: door.height || 7, // Default 7ft
          quantity: 1,
          unit: "sqft",
          total: (door.width || 3) * (door.height || 7),
        });
      });
    }

    // Convert facade analysis to measurements
    if (analysisData.facades) {
      analysisData.facades.forEach((facade: any, index: number) => {
        const category = this.inferFacadeCategory(facade.material);
        entries.push({
          id: generateUniqueId(),
          category,
          description: `${facade.material} Facade ${index + 1}`,
          location: facade.orientation || "Unknown",
          width: facade.width || 20,
          height: facade.height || 10,
          quantity: 1,
          unit: "sqft",
          total: (facade.width || 20) * (facade.height || 10),
        });
      });
    }

    return entries;
  }

  // Import from area measurements (Step 4)
  importFromAreaMeasurements(shapes: any[]): MeasurementEntry[] {
    const entries: MeasurementEntry[] = [];

    shapes.forEach((shape) => {
      const category = this.inferCategory(shape.label);
      entries.push({
        id: generateUniqueId(),
        category,
        description: shape.label,
        location: "See area map",
        width: Math.sqrt(shape.area), // Approximate for display
        height: Math.sqrt(shape.area),
        quantity: 1,
        unit: "sqft",
        total: shape.area,
      });
    });

    return entries;
  }

  /**
   * Import measurements from CSV file with validation and sanitization
   */
  async importFromCSV(file: File): Promise<MeasurementEntry[]> {
    const text = await file.text();
    const lines = text.split("\n");
    const headers = lines[0].toLowerCase().split(",");

    const entries: MeasurementEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      if (values.length < 3) continue;

      const entry: MeasurementEntry = {
        id: generateUniqueId(),
        category: this.inferCategory(sanitizeInput(values[0])),
        description: sanitizeInput(values[0]),
        location: sanitizeInput(values[1] || ""),
        width: parseNumber(values[2], 0),
        height: parseNumber(values[3], 0),
        quantity: parseNumber(values[4], 1),
        unit: "sqft",
        total: 0,
        notes: sanitizeInput(values[5] || ""),
      };

      entry.total = calculateArea(entry.width, entry.height, entry.quantity);
      entries.push(entry);
    }

    return entries;
  }

  /**
   * Import measurements from Excel file with validation
   */
  async importFromExcel(file: File): Promise<MeasurementEntry[]> {
    try {
      // Use ExcelJS to parse Excel
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet(1); // Get first worksheet
      if (!worksheet) {
        throw new Error("No worksheet found in Excel file");
      }

      const jsonData: any[] = [];
      const headers: string[] = [];

      // Get headers from first row
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || `Column ${colNumber}`;
      });

      // Convert rows to objects
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const rowData: any = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.value;
          }
        });

        if (Object.keys(rowData).length > 0) {
          jsonData.push(rowData);
        }
      });

      return jsonData.map((row: any) => this.parseExcelRow(row));
    } catch (error) {
      console.error("Error importing Excel file:", error);
      throw new ImportError(
        "Failed to import Excel file. Please check the format.",
        "excel",
        undefined,
        undefined,
      );
    }
  }

  // Import from NearMap measurements
  importFromNearMap(nearMapData: any): MeasurementEntry[] {
    const entries: MeasurementEntry[] = [];

    if (nearMapData.measurements) {
      nearMapData.measurements.forEach((measurement: any) => {
        const category = this.inferCategory(measurement.type);
        entries.push({
          id: generateUniqueId(),
          category,
          description: measurement.name || measurement.type,
          location: measurement.address || "NearMap Location",
          width: measurement.width || 0,
          height: measurement.height || 0,
          length: measurement.length,
          quantity: measurement.quantity || 1,
          unit:
            measurement.unit === "sq_m"
              ? "sqft"
              : (measurement.unit as any) || "sqft",
          total: convertToSquareFeet(measurement.area, measurement.unit),
          notes: `Imported from NearMap - ${measurement.date || "Unknown date"}`,
        });
      });
    }

    return entries;
  }

  // Parse Excel row data
  private parseExcelRow(row: any): MeasurementEntry {
    const entry: MeasurementEntry = {
      id: generateUniqueId(),
      category: this.inferCategory(
        sanitizeInput(row.Description || row.description || ""),
      ),
      description: sanitizeInput(row.Description || row.description || ""),
      location: sanitizeInput(row.Location || row.location || ""),
      width: parseNumber(row.Width || row.width, 0),
      height: parseNumber(row.Height || row.height, 0),
      length: parseNumber(row.Length || row.length, 0) || undefined,
      quantity: parseNumber(row.Quantity || row.quantity, 1),
      unit: "sqft",
      total: 0,
      notes: sanitizeInput(row.Notes || row.notes || ""),
    };

    // Calculate total based on available dimensions
    if (entry.length) {
      entry.total = entry.width * entry.length * entry.quantity;
    } else {
      entry.total = calculateArea(entry.width, entry.height, entry.quantity);
    }

    return entry;
  }

  // Infer measurement category from description
  private inferCategory(description: string): MeasurementCategory {
    const lower = description.toLowerCase();

    // Glass categories
    if (lower.includes("window")) return "glass_windows";
    if (
      lower.includes("door") &&
      (lower.includes("glass") || lower.includes("entrance"))
    )
      return "glass_doors";
    if (lower.includes("storefront") || lower.includes("curtain wall"))
      return "glass_storefront";

    // Facade categories
    if (lower.includes("brick") || lower.includes("masonry"))
      return "facade_brick";
    if (lower.includes("concrete") || lower.includes("precast"))
      return "facade_concrete";
    if (
      lower.includes("metal") ||
      lower.includes("aluminum") ||
      lower.includes("steel")
    )
      return "facade_metal";
    if (
      lower.includes("stone") ||
      lower.includes("granite") ||
      lower.includes("marble")
    )
      return "facade_stone";

    // Parking categories
    if (lower.includes("parking space") || lower.includes("car space"))
      return "parking_spaces";
    if (lower.includes("parking deck") || lower.includes("garage deck"))
      return "parking_deck";

    // Specialized categories
    if (lower.includes("retaining wall") || lower.includes("retention wall"))
      return "retaining_wall";
    if (lower.includes("inner wall") || lower.includes("interior wall"))
      return "inner_wall";
    if (lower.includes("ceiling") || lower.includes("overhead"))
      return "ceiling";
    if (lower.includes("footprint") || lower.includes("foundation"))
      return "footprint";

    // Default to flat surface for general areas
    return "flat_surface";
  }

  // Infer facade category from material analysis
  private inferFacadeCategory(material: string): MeasurementCategory {
    const lower = material.toLowerCase();

    if (lower.includes("brick") || lower.includes("masonry"))
      return "facade_brick";
    if (lower.includes("concrete") || lower.includes("cement"))
      return "facade_concrete";
    if (
      lower.includes("metal") ||
      lower.includes("aluminum") ||
      lower.includes("steel")
    )
      return "facade_metal";
    if (
      lower.includes("stone") ||
      lower.includes("granite") ||
      lower.includes("marble")
    )
      return "facade_stone";

    // Default to concrete for unknown materials
    return "facade_concrete";
  }

  // Validate imported data
  validateImportedData(entries: MeasurementEntry[]): {
    valid: MeasurementEntry[];
    invalid: any[];
  } {
    const valid: MeasurementEntry[] = [];
    const invalid: any[] = [];

    entries.forEach((entry) => {
      if (this.isValidEntry(entry)) {
        valid.push(entry);
      } else {
        invalid.push({
          entry,
          errors: this.getValidationErrors(entry),
        });
      }
    });

    return { valid, invalid };
  }

  // Check if entry is valid
  private isValidEntry(entry: MeasurementEntry): boolean {
    return !!(
      entry.id &&
      entry.category &&
      entry.description &&
      entry.width >= 0 &&
      entry.height >= 0 &&
      entry.quantity > 0
    );
  }

  // Get validation errors for entry
  private getValidationErrors(entry: MeasurementEntry): string[] {
    const errors: string[] = [];

    if (!entry.id) errors.push("Missing ID");
    if (!entry.category) errors.push("Missing category");
    if (!entry.description) errors.push("Missing description");
    if (entry.width < 0) errors.push("Width cannot be negative");
    if (entry.height < 0) errors.push("Height cannot be negative");
    if (entry.quantity <= 0) errors.push("Quantity must be greater than 0");

    return errors;
  }
}
