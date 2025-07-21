import { MeasurementEntry } from "@/lib/types/measurements";

export class TakeoffExportService {
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
      ...rows.map((row) =>
        row.map((cell) => this.escapeCsvCell(cell)).join(","),
      ),
    ].join("\n");

    return csv;
  }

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
          metric: category
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
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
        category: m.category
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
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
        const sheetName = this.cleanSheetName(category);
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
      throw new Error(
        "Failed to export to Excel. Please try CSV export instead.",
      );
    }
  }

  exportToPDF(measurements: MeasurementEntry[]): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTML content for PDF
        const htmlContent = this.generatePDFContent(measurements);

        // For now, return a simple text file since PDF generation requires additional libraries
        // In production, you would use libraries like jsPDF or Puppeteer
        const blob = new Blob([htmlContent], { type: "text/html" });
        resolve(blob);
      } catch (error) {
        reject(
          new Error(
            "PDF export not yet implemented. Please use CSV or Excel export.",
          ),
        );
      }
    });
  }

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
    return measurements.reduce(
      (acc, m) => {
        if (!acc[m.category]) acc[m.category] = [];
        acc[m.category].push(m);
        return acc;
      },
      {} as Record<string, MeasurementEntry[]>,
    );
  }

  private escapeCsvCell(cell: string): string {
    // Handle CSV escaping
    if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }

  private cleanSheetName(category: string): string {
    // Excel sheet names cannot exceed 31 characters and cannot contain certain characters
    return category
      .replace(/_/g, " ")
      .replace(/[\\\/\*\?\[\]]/g, "")
      .substring(0, 31)
      .trim();
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
            <h3>${category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</h3>
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

  // Helper method to download file
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

  // Validation method
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
