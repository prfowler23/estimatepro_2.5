import { MeasurementEntry } from '@/lib/types/measurements';

export class TakeoffExportService {
  exportToCSV(measurements: MeasurementEntry[]): string {
    const headers = [
      'Category',
      'Description',
      'Location',
      'Width (ft)',
      'Height/Length (ft)',
      'Quantity',
      'Unit',
      'Total',
      'Notes'
    ];
    
    const rows = measurements.map(m => [
      m.category,
      m.description,
      m.location,
      m.width.toString(),
      (m.height || m.length || 0).toString(),
      m.quantity.toString(),
      m.unit,
      m.total.toFixed(2),
      m.notes || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => 
        this.escapeCsvCell(cell)
      ).join(','))
    ].join('\n');
    
    return csv;
  }
  
  async exportToExcel(measurements: MeasurementEntry[]): Promise<Blob> {
    try {
      // Dynamic import for xlsx to avoid bundle size issues
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      
      // Group by category
      const grouped = this.groupByCategory(measurements);
      
      // Create summary sheet
      const summaryData = [
        { 'Metric': 'Total Measurements', 'Value': measurements.length },
        { 'Metric': 'Total Categories', 'Value': Object.keys(grouped).length },
        { 'Metric': 'Total Area (sqft)', 'Value': measurements.reduce((sum, m) => sum + m.total, 0).toFixed(2) },
        { 'Metric': '', 'Value': '' }, // Empty row
        { 'Metric': 'Category Breakdown', 'Value': '' },
        ...Object.entries(grouped).map(([category, entries]) => ({
          'Metric': category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          'Value': `${entries.reduce((sum, e) => sum + e.total, 0).toFixed(2)} sqft (${entries.length} entries)`
        }))
      ];
      
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');
      
      // Create detailed measurements sheet
      const detailedData = measurements.map(m => ({
        'Category': m.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        'Description': m.description,
        'Location': m.location,
        'Width (ft)': m.width,
        'Height/Length (ft)': m.height || m.length || 0,
        'Quantity': m.quantity,
        'Unit': m.unit,
        'Total': m.total.toFixed(2),
        'Notes': m.notes || ''
      }));
      
      const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(wb, detailedSheet, 'All Measurements');
      
      // Create sheet for each category (limit to first 10 categories to avoid too many sheets)
      const categoryEntries = Object.entries(grouped).slice(0, 10);
      categoryEntries.forEach(([category, entries]) => {
        const categoryData = entries.map(e => ({
          'Description': e.description,
          'Location': e.location,
          'Width (ft)': e.width,
          'Height/Length (ft)': e.height || e.length || 0,
          'Quantity': e.quantity,
          'Unit': e.unit,
          'Total': e.total.toFixed(2),
          'Notes': e.notes || ''
        }));
        
        const sheet = XLSX.utils.json_to_sheet(categoryData);
        
        // Clean category name for sheet name (Excel has limitations)
        const sheetName = this.cleanSheetName(category);
        XLSX.utils.book_append_sheet(wb, sheet, sheetName);
      });
      
      // Convert to blob
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Failed to export to Excel. Please try CSV export instead.');
    }
  }
  
  exportToPDF(measurements: MeasurementEntry[]): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTML content for PDF
        const htmlContent = this.generatePDFContent(measurements);
        
        // For now, return a simple text file since PDF generation requires additional libraries
        // In production, you would use libraries like jsPDF or Puppeteer
        const blob = new Blob([htmlContent], { type: 'text/html' });
        resolve(blob);
      } catch (error) {
        reject(new Error('PDF export not yet implemented. Please use CSV or Excel export.'));
      }
    });
  }
  
  exportForEstimation(measurements: MeasurementEntry[], services: string[]): string {
    // Create a specialized export format for estimation software
    const grouped = this.groupByCategory(measurements);
    const estimationData = {
      project: {
        date: new Date().toISOString(),
        services: services,
        totalMeasurements: measurements.length
      },
      categories: Object.entries(grouped).map(([category, entries]) => ({
        category,
        totalArea: entries.reduce((sum, e) => sum + e.total, 0),
        entries: entries.map(e => ({
          description: e.description,
          location: e.location,
          dimensions: {
            width: e.width,
            height: e.height || e.length || 0,
            quantity: e.quantity
          },
          total: e.total,
          unit: e.unit
        }))
      })),
      totals: {
        glass: this.getCategoryTotal(grouped, ['glass_windows', 'glass_doors', 'glass_storefront']),
        facade: this.getCategoryTotal(grouped, Object.keys(grouped).filter(k => k.startsWith('facade_'))),
        flatSurface: this.getCategoryTotal(grouped, ['flat_surface']),
        parking: this.getCategoryTotal(grouped, ['parking_spaces', 'parking_deck']),
        specialized: this.getCategoryTotal(grouped, ['retaining_wall', 'inner_wall', 'ceiling', 'footprint'])
      }
    };
    
    return JSON.stringify(estimationData, null, 2);
  }
  
  private groupByCategory(measurements: MeasurementEntry[]): Record<string, MeasurementEntry[]> {
    return measurements.reduce((acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    }, {} as Record<string, MeasurementEntry[]>);
  }
  
  private escapeCsvCell(cell: string): string {
    // Handle CSV escaping
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  }
  
  private cleanSheetName(category: string): string {
    // Excel sheet names cannot exceed 31 characters and cannot contain certain characters
    return category
      .replace(/_/g, ' ')
      .replace(/[\\\/\*\?\[\]]/g, '')
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
    
    ${Object.entries(grouped).map(([category, entries]) => `
        <div class="category">
            <h3>${category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
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
                    ${entries.map(e => `
                        <tr>
                            <td>${e.description}</td>
                            <td>${e.location}</td>
                            <td>${e.width}</td>
                            <td>${e.height || e.length || 0}</td>
                            <td>${e.quantity}</td>
                            <td>${e.total.toFixed(2)} ${e.unit}</td>
                        </tr>
                    `).join('')}
                    <tr class="total">
                        <td colspan="5"><strong>Category Total:</strong></td>
                        <td><strong>${entries.reduce((sum, e) => sum + e.total, 0).toFixed(2)} sqft</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `).join('')}
</body>
</html>`;
  }
  
  private getCategoryTotal(grouped: Record<string, MeasurementEntry[]>, categories: string[]): number {
    return categories.reduce((total, category) => {
      const entries = grouped[category] || [];
      return total + entries.reduce((sum, e) => sum + e.total, 0);
    }, 0);
  }
  
  // Helper method to download file
  downloadFile(content: string | Blob, filename: string, mimeType: string = 'text/plain'): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  // Validation method
  validateMeasurements(measurements: MeasurementEntry[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (measurements.length === 0) {
      errors.push('No measurements to export');
      return { valid: false, errors };
    }
    
    const invalidMeasurements = measurements.filter(m => 
      !m.description || 
      m.width <= 0 || 
      (m.height || 0) <= 0 || 
      m.quantity <= 0 ||
      m.total <= 0
    );
    
    if (invalidMeasurements.length > 0) {
      errors.push(`${invalidMeasurements.length} measurement(s) have invalid data (missing description, zero dimensions, or zero total)`);
    }
    
    const missingCategories = measurements.filter(m => !m.category);
    if (missingCategories.length > 0) {
      errors.push(`${missingCategories.length} measurement(s) missing category information`);
    }
    
    return { valid: errors.length === 0, errors };
  }
}