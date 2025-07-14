import { MeasurementEntry, MeasurementCategory } from '@/lib/types/measurements';

// Helper function to generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export class TakeoffImportService {
  // Import from photo analysis (Step 3)
  importFromPhotoAnalysis(analysisData: any): MeasurementEntry[] {
    const entries: MeasurementEntry[] = [];
    
    // Convert window detection to measurements
    if (analysisData.windows) {
      analysisData.windows.locations.forEach((window: any, index: number) => {
        entries.push({
          id: generateId(),
          category: 'glass_windows',
          description: `Window ${index + 1}`,
          location: `Grid position ${window.gridPosition}`,
          width: window.width || 3, // Default 3ft
          height: window.height || 5, // Default 5ft
          quantity: 1,
          unit: 'sqft',
          total: (window.width || 3) * (window.height || 5)
        });
      });
    }
    
    // Convert door detection to measurements
    if (analysisData.doors) {
      analysisData.doors.locations.forEach((door: any, index: number) => {
        entries.push({
          id: generateId(),
          category: 'glass_doors',
          description: `Door ${index + 1}`,
          location: `Grid position ${door.gridPosition}`,
          width: door.width || 3, // Default 3ft
          height: door.height || 7, // Default 7ft
          quantity: 1,
          unit: 'sqft',
          total: (door.width || 3) * (door.height || 7)
        });
      });
    }
    
    // Convert facade analysis to measurements
    if (analysisData.facades) {
      analysisData.facades.forEach((facade: any, index: number) => {
        const category = this.inferFacadeCategory(facade.material);
        entries.push({
          id: generateId(),
          category,
          description: `${facade.material} Facade ${index + 1}`,
          location: facade.orientation || 'Unknown',
          width: facade.width || 20,
          height: facade.height || 10,
          quantity: 1,
          unit: 'sqft',
          total: (facade.width || 20) * (facade.height || 10)
        });
      });
    }
    
    return entries;
  }
  
  // Import from area measurements (Step 4)
  importFromAreaMeasurements(shapes: any[]): MeasurementEntry[] {
    const entries: MeasurementEntry[] = [];
    
    shapes.forEach(shape => {
      const category = this.inferCategory(shape.label);
      entries.push({
        id: generateId(),
        category,
        description: shape.label,
        location: 'See area map',
        width: Math.sqrt(shape.area), // Approximate for display
        height: Math.sqrt(shape.area),
        quantity: 1,
        unit: 'sqft',
        total: shape.area
      });
    });
    
    return entries;
  }
  
  // Import from CSV (measurement tools)
  async importFromCSV(file: File): Promise<MeasurementEntry[]> {
    const text = await file.text();
    const lines = text.split('\n');
    const headers = lines[0].toLowerCase().split(',');
    
    const entries: MeasurementEntry[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length < 3) continue;
      
      const entry: MeasurementEntry = {
        id: generateId(),
        category: this.inferCategory(values[0]),
        description: values[0],
        location: values[1] || '',
        width: parseFloat(values[2]) || 0,
        height: parseFloat(values[3]) || 0,
        quantity: parseInt(values[4]) || 1,
        unit: 'sqft',
        total: 0,
        notes: values[5] || ''
      };
      
      entry.total = entry.width * entry.height * entry.quantity;
      entries.push(entry);
    }
    
    return entries;
  }
  
  // Import from Excel
  async importFromExcel(file: File): Promise<MeasurementEntry[]> {
    try {
      // Use SheetJS to parse Excel
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      return jsonData.map((row: any) => this.parseExcelRow(row));
    } catch (error) {
      console.error('Error importing Excel file:', error);
      throw new Error('Failed to import Excel file. Please check the format.');
    }
  }
  
  // Import from NearMap measurements
  importFromNearMap(nearMapData: any): MeasurementEntry[] {
    const entries: MeasurementEntry[] = [];
    
    if (nearMapData.measurements) {
      nearMapData.measurements.forEach((measurement: any) => {
        const category = this.inferCategory(measurement.type);
        entries.push({
          id: generateId(),
          category,
          description: measurement.name || measurement.type,
          location: measurement.address || 'NearMap Location',
          width: measurement.width || 0,
          height: measurement.height || 0,
          length: measurement.length,
          quantity: measurement.quantity || 1,
          unit: measurement.unit === 'sq_m' ? 'sqft' : (measurement.unit as any) || 'sqft',
          total: this.convertToSquareFeet(measurement.area, measurement.unit),
          notes: `Imported from NearMap - ${measurement.date || 'Unknown date'}`
        });
      });
    }
    
    return entries;
  }
  
  // Parse Excel row data
  private parseExcelRow(row: any): MeasurementEntry {
    const entry: MeasurementEntry = {
      id: generateId(),
      category: this.inferCategory(row.Description || row.description || ''),
      description: row.Description || row.description || '',
      location: row.Location || row.location || '',
      width: parseFloat(row.Width || row.width || '0') || 0,
      height: parseFloat(row.Height || row.height || '0') || 0,
      length: parseFloat(row.Length || row.length || '0') || undefined,
      quantity: parseInt(row.Quantity || row.quantity || '1') || 1,
      unit: 'sqft',
      total: 0,
      notes: row.Notes || row.notes || ''
    };
    
    // Calculate total based on available dimensions
    if (entry.length) {
      entry.total = entry.width * entry.length * entry.quantity;
    } else {
      entry.total = entry.width * entry.height * entry.quantity;
    }
    
    return entry;
  }
  
  // Infer measurement category from description
  private inferCategory(description: string): MeasurementCategory {
    const lower = description.toLowerCase();
    
    // Glass categories
    if (lower.includes('window')) return 'glass_windows';
    if (lower.includes('door') && (lower.includes('glass') || lower.includes('entrance'))) return 'glass_doors';
    if (lower.includes('storefront') || lower.includes('curtain wall')) return 'glass_storefront';
    
    // Facade categories
    if (lower.includes('brick') || lower.includes('masonry')) return 'facade_brick';
    if (lower.includes('concrete') || lower.includes('precast')) return 'facade_concrete';
    if (lower.includes('metal') || lower.includes('aluminum') || lower.includes('steel')) return 'facade_metal';
    if (lower.includes('stone') || lower.includes('granite') || lower.includes('marble')) return 'facade_stone';
    
    // Parking categories
    if (lower.includes('parking space') || lower.includes('car space')) return 'parking_spaces';
    if (lower.includes('parking deck') || lower.includes('garage deck')) return 'parking_deck';
    
    // Specialized categories
    if (lower.includes('retaining wall') || lower.includes('retention wall')) return 'retaining_wall';
    if (lower.includes('inner wall') || lower.includes('interior wall')) return 'inner_wall';
    if (lower.includes('ceiling') || lower.includes('overhead')) return 'ceiling';
    if (lower.includes('footprint') || lower.includes('foundation')) return 'footprint';
    
    // Default to flat surface for general areas
    return 'flat_surface';
  }
  
  // Infer facade category from material analysis
  private inferFacadeCategory(material: string): MeasurementCategory {
    const lower = material.toLowerCase();
    
    if (lower.includes('brick') || lower.includes('masonry')) return 'facade_brick';
    if (lower.includes('concrete') || lower.includes('cement')) return 'facade_concrete';
    if (lower.includes('metal') || lower.includes('aluminum') || lower.includes('steel')) return 'facade_metal';
    if (lower.includes('stone') || lower.includes('granite') || lower.includes('marble')) return 'facade_stone';
    
    // Default to concrete for unknown materials
    return 'facade_concrete';
  }
  
  // Convert various units to square feet
  private convertToSquareFeet(value: number, unit: string): number {
    switch (unit?.toLowerCase()) {
      case 'sq_m':
      case 'sqm':
      case 'm2':
        return value * 10.764; // Square meters to square feet
      case 'sq_yd':
      case 'sqyd':
        return value * 9; // Square yards to square feet
      case 'sq_ft':
      case 'sqft':
      case 'ft2':
      default:
        return value;
    }
  }
  
  // Validate imported data
  validateImportedData(entries: MeasurementEntry[]): { valid: MeasurementEntry[], invalid: any[] } {
    const valid: MeasurementEntry[] = [];
    const invalid: any[] = [];
    
    entries.forEach(entry => {
      if (this.isValidEntry(entry)) {
        valid.push(entry);
      } else {
        invalid.push({
          entry,
          errors: this.getValidationErrors(entry)
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
    
    if (!entry.id) errors.push('Missing ID');
    if (!entry.category) errors.push('Missing category');
    if (!entry.description) errors.push('Missing description');
    if (entry.width < 0) errors.push('Width cannot be negative');
    if (entry.height < 0) errors.push('Height cannot be negative');
    if (entry.quantity <= 0) errors.push('Quantity must be greater than 0');
    
    return errors;
  }
}