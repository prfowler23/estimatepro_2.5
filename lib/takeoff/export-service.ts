import { MeasurementEntry } from "@/lib/types/measurements";
import {
  escapeCsvCell,
  formatCategoryName,
  cleanExcelSheetName,
  groupBy,
} from "./utils";
import { ExportError } from "./errors";

/**
 * Service for exporting takeoff measurements to various formats
 */
export class TakeoffExportService {
  /**
   * Export measurements to CSV format
   * @param measurements - Array of measurement entries to export
   * @returns CSV string with properly escaped cells
   */
  exportToCSV(measurements: MeasurementEntry[]): string {
    const headers = [
      "Category",
      "Description",
      "Location",
      "Width (ft)",
      "Height/Length (ft)",
      "Quantity",
      "Unit",
      "Total",
      "Notes",
    ];

    const rows = measurements.map((m) => [
      m.category,
      m.description,
      m.location,
      m.width.toString(),
      (m.height || m.length || 0).toString(),
      m.quantity.toString(),
      m.unit,
      m.total.toFixed(2),
      m.notes || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")),
    ].join("\n");

    return csv;
  }

  /**
   * Export measurements to Excel format with multiple sheets
   * @param measurements - Array of measurement entries to export
   * @returns Promise resolving to Excel file blob
   * @throws {ExportError} If Excel generation fails
   */
  async exportToExcel(measurements: MeasurementEntry[]): Promise<Blob> {
    try {
      // Dynamic import for exceljs to avoid bundle size issues
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();

      // Group by category
      const grouped = this.groupByCategory(measurements);

      // Create summary sheet
      const summarySheet = workbook.addWorksheet("Summary");
      summarySheet.columns = [
        { header: "Metric", key: "metric", width: 25 },
        { header: "Value", key: "value", width: 20 },
      ];

      const summaryData = [
        { metric: "Total Measurements", value: measurements.length },
        { metric: "Total Categories", value: Object.keys(grouped).length },
        {
          metric: "Total Area (sqft)",
          value: measurements.reduce((sum, m) => sum + m.total, 0).toFixed(2),
        },
        { metric: "", value: "" }, // Empty row
        { metric: "Category Breakdown", value: "" },
        ...Object.entries(grouped).map(([category, entries]) => ({
          metric: formatCategoryName(category),
          value: `${entries.reduce((sum, e) => sum + e.total, 0).toFixed(2)} sqft (${entries.length} entries)`,
        })),
      ];

      summarySheet.addRows(summaryData);

      // Create detailed measurements sheet
      const detailedSheet = workbook.addWorksheet("All Measurements");
      detailedSheet.columns = [
        { header: "Category", key: "category", width: 15 },
        { header: "Description", key: "description", width: 20 },
        { header: "Location", key: "location", width: 15 },
        { header: "Width (ft)", key: "width", width: 12 },
        { header: "Height/Length (ft)", key: "height", width: 15 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Unit", key: "unit", width: 8 },
        { header: "Total", key: "total", width: 10 },
        { header: "Notes", key: "notes", width: 20 },
      ];

      const detailedData = measurements.map((m) => ({
        category: formatCategoryName(m.category),
        description: m.description,
        location: m.location,
        width: m.width,
        height: m.height || m.length || 0,
        quantity: m.quantity,
        unit: m.unit,
        total: m.total.toFixed(2),
        notes: m.notes || "",
      }));

      detailedSheet.addRows(detailedData);

      // Create sheet for each category (limit to first 10 categories to avoid too many sheets)
      const categoryEntries = Object.entries(grouped).slice(0, 10);
      categoryEntries.forEach(([category, entries]) => {
        const sheetName = cleanExcelSheetName(category);
        const categorySheet = workbook.addWorksheet(sheetName);

        categorySheet.columns = [
          { header: "Description", key: "description", width: 20 },
          { header: "Location", key: "location", width: 15 },
          { header: "Width (ft)", key: "width", width: 12 },
          { header: "Height/Length (ft)", key: "height", width: 15 },
          { header: "Quantity", key: "quantity", width: 10 },
          { header: "Unit", key: "unit", width: 8 },
          { header: "Total", key: "total", width: 10 },
          { header: "Notes", key: "notes", width: 20 },
        ];

        const categoryData = entries.map((e) => ({
          description: e.description,
          location: e.location,
          width: e.width,
          height: e.height || e.length || 0,
          quantity: e.quantity,
          unit: e.unit,
          total: e.total.toFixed(2),
          notes: e.notes || "",
        }));

        categorySheet.addRows(categoryData);
      });

      // Convert to blob
      const buffer = await workbook.xlsx.writeBuffer();
      return new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      throw new ExportError(
        "Failed to export to Excel. Please try CSV export instead.",
        "excel",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  /**
   * Export measurements to PDF format (currently returns HTML)
   * @param measurements - Array of measurement entries to export
   * @returns Promise resolving to HTML blob (PDF generation pending)
   * @throws {ExportError} For PDF generation errors
   */
  async exportToPDF(measurements: MeasurementEntry[]): Promise<Blob> {
    try {
      // Create HTML content for PDF
      const htmlContent = this.generatePDFContent(measurements);

      // For now, return a simple text file since PDF generation requires additional libraries
      // In production, you would use libraries like jsPDF or Puppeteer
      return new Blob([htmlContent], { type: "text/html" });
    } catch (error) {
      throw new ExportError(
        "PDF export not yet implemented. Please use CSV or Excel export.",
        "pdf",
        "Feature not implemented",
      );
    }
  }

  /**
   * Export measurements in a format optimized for estimation software
   * @param measurements - Array of measurement entries
   * @param services - List of service codes to include
   * @returns JSON string with structured estimation data
   */
  exportForEstimation(
    measurements: MeasurementEntry[],
    services: string[],
  ): string {
    // Create a specialized export format for estimation software
    const grouped = this.groupByCategory(measurements);
    const estimationData = {
      project: {
        date: new Date().toISOString(),
        services: services,
        totalMeasurements: measurements.length,
      },
      categories: Object.entries(grouped).map(([category, entries]) => ({
        category,
        totalArea: entries.reduce((sum, e) => sum + e.total, 0),
        entries: entries.map((e) => ({
          description: e.description,
          location: e.location,
          dimensions: {
            width: e.width,
            height: e.height || e.length || 0,
            quantity: e.quantity,
          },
          total: e.total,
          unit: e.unit,
        })),
      })),
      totals: {
        glass: this.getCategoryTotal(grouped, [
          "glass_windows",
          "glass_doors",
          "glass_storefront",
        ]),
        facade: this.getCategoryTotal(
          grouped,
          Object.keys(grouped).filter((k) => k.startsWith("facade_")),
        ),
        flatSurface: this.getCategoryTotal(grouped, ["flat_surface"]),
        parking: this.getCategoryTotal(grouped, [
          "parking_spaces",
          "parking_deck",
        ]),
        specialized: this.getCategoryTotal(grouped, [
          "retaining_wall",
          "inner_wall",
          "ceiling",
          "footprint",
        ]),
      },
    };

    return JSON.stringify(estimationData, null, 2);
  }

  private groupByCategory(
    measurements: MeasurementEntry[],
  ): Record<string, MeasurementEntry[]> {
    return groupBy(measurements, (m) => m.category);
  }

  private generatePDFContent(measurements: MeasurementEntry[]): string {
    const grouped = this.groupByCategory(measurements);
    const totalArea = measurements.reduce((sum, m) => sum + m.total, 0);

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Takeoff Measurements Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
        .category { margin-bottom: 20px; }
        .category h3 { color: #333; border-bottom: 2px solid #ccc; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; background-color: #e8f4fd; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Takeoff Measurements Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Measurements:</strong> ${measurements.length}</p>
        <p><strong>Total Area:</strong> ${totalArea.toFixed(2)} sqft</p>
        <p><strong>Categories:</strong> ${Object.keys(grouped).length}</p>
    </div>
    
    ${Object.entries(grouped)
      .map(
        ([category, entries]) => `
        <div class="category">
            <h3>${formatCategoryName(category)}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Location</th>
                        <th>Width</th>
                        <th>Height</th>
                        <th>Qty</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries
                      .map(
                        (e) => `
                        <tr>
                            <td>${e.description}</td>
                            <td>${e.location}</td>
                            <td>${e.width}</td>
                            <td>${e.height || e.length || 0}</td>
                            <td>${e.quantity}</td>
                            <td>${e.total.toFixed(2)} ${e.unit}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                    <tr class="total">
                        <td colspan="5"><strong>Category Total:</strong></td>
                        <td><strong>${entries.reduce((sum, e) => sum + e.total, 0).toFixed(2)} sqft</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `,
      )
      .join("")}
</body>
</html>`;
  }

  private getCategoryTotal(
    grouped: Record<string, MeasurementEntry[]>,
    categories: string[],
  ): number {
    return categories.reduce((total, category) => {
      const entries = grouped[category] || [];
      return total + entries.reduce((sum, e) => sum + e.total, 0);
    }, 0);
  }

  /**
   * Download file to user's device
   * @param content - File content as string or Blob
   * @param filename - Name for the downloaded file
   * @param mimeType - MIME type of the file
   */
  downloadFile(
    content: string | Blob,
    filename: string,
    mimeType: string = "text/plain",
  ): void {
    const blob =
      content instanceof Blob
        ? content
        : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Validate measurements before export
   * @param measurements - Array of measurements to validate
   * @returns Validation result with errors array
   */
  validateMeasurements(measurements: MeasurementEntry[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (measurements.length === 0) {
      errors.push("No measurements to export");
      return { valid: false, errors };
    }

    const invalidMeasurements = measurements.filter(
      (m) =>
        !m.description ||
        m.width <= 0 ||
        (m.height || 0) <= 0 ||
        m.quantity <= 0 ||
        m.total <= 0,
    );

    if (invalidMeasurements.length > 0) {
      errors.push(
        `${invalidMeasurements.length} measurement(s) have invalid data (missing description, zero dimensions, or zero total)`,
      );
    }

    const missingCategories = measurements.filter((m) => !m.category);
    if (missingCategories.length > 0) {
      errors.push(
        `${missingCategories.length} measurement(s) missing category information`,
      );
    }

    return { valid: errors.length === 0, errors };
  }
}
