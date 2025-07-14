export interface MeasurementEntry {
  id: string;
  category: MeasurementCategory;
  description: string;
  location: string;
  width: number;
  height: number;
  length?: number;
  quantity: number;
  unit: 'ft' | 'sqft' | 'lf' | 'ea';
  total: number;
  notes?: string;
}

export type MeasurementCategory = 
  | 'glass_windows'
  | 'glass_doors'
  | 'glass_storefront'
  | 'facade_brick'
  | 'facade_concrete'
  | 'facade_metal'
  | 'facade_stone'
  | 'flat_surface'
  | 'parking_spaces'
  | 'parking_deck'
  | 'retaining_wall'
  | 'inner_wall'
  | 'ceiling'
  | 'footprint';

export interface MeasurementTemplate {
  category: MeasurementCategory;
  requiredFor: string[]; // Service IDs
  fields: {
    name: string;
    type: 'number' | 'text' | 'select';
    required: boolean;
    options?: string[];
  }[];
  calculation: 'area' | 'linear' | 'count' | 'volume';
}

export const MEASUREMENT_TEMPLATES: Record<string, MeasurementTemplate> = {
  glass_windows: {
    category: 'glass_windows',
    requiredFor: ['WC', 'GR'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'height', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  glass_doors: {
    category: 'glass_doors',
    requiredFor: ['WC', 'GR'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'height', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  glass_storefront: {
    category: 'glass_storefront',
    requiredFor: ['WC', 'GR'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'height', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  facade_brick: {
    category: 'facade_brick',
    requiredFor: ['BWP', 'BWS', 'HBW'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'height', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  facade_concrete: {
    category: 'facade_concrete',
    requiredFor: ['BWP', 'BWS', 'HBW'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'height', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  facade_metal: {
    category: 'facade_metal',
    requiredFor: ['BWP', 'BWS', 'HBW'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'height', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  facade_stone: {
    category: 'facade_stone',
    requiredFor: ['BWP', 'BWS', 'HBW'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'height', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  flat_surface: {
    category: 'flat_surface',
    requiredFor: ['PWF', 'HFS', 'PC'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'length', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  parking_spaces: {
    category: 'parking_spaces',
    requiredFor: ['PC', 'PWP'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'quantity', type: 'number', required: true },
      { name: 'type', type: 'select', required: true, options: ['standard', 'compact', 'handicap', 'motorcycle'] }
    ],
    calculation: 'count'
  },
  parking_deck: {
    category: 'parking_deck',
    requiredFor: ['PWP', 'PC'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'length', type: 'number', required: true },
      { name: 'levels', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  retaining_wall: {
    category: 'retaining_wall',
    requiredFor: ['BWP', 'BWS'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'length', type: 'number', required: true },
      { name: 'height', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  inner_wall: {
    category: 'inner_wall',
    requiredFor: ['IW'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'height', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  ceiling: {
    category: 'ceiling',
    requiredFor: ['DC'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'length', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  },
  footprint: {
    category: 'footprint',
    requiredFor: ['BWP', 'BWS', 'HBW', 'PWF'],
    fields: [
      { name: 'location', type: 'text', required: true },
      { name: 'width', type: 'number', required: true },
      { name: 'length', type: 'number', required: true },
      { name: 'quantity', type: 'number', required: true }
    ],
    calculation: 'area'
  }
};

// Helper function to calculate measurement based on template
export function calculateMeasurement(
  template: MeasurementTemplate,
  values: Record<string, number>
): number {
  switch (template.calculation) {
    case 'area':
      if ('width' in values && 'height' in values) {
        return values.width * values.height * (values.quantity || 1);
      }
      if ('width' in values && 'length' in values) {
        return values.width * values.length * (values.quantity || 1);
      }
      return 0;
    case 'linear':
      return (values.length || values.width || 0) * (values.quantity || 1);
    case 'count':
      return values.quantity || 0;
    case 'volume':
      return values.width * values.height * values.length * (values.quantity || 1);
    default:
      return 0;
  }
}

// Helper function to get unit based on calculation type
export function getUnitForCalculation(calculation: MeasurementTemplate['calculation']): MeasurementEntry['unit'] {
  switch (calculation) {
    case 'area':
      return 'sqft';
    case 'linear':
      return 'lf';
    case 'count':
      return 'ea';
    case 'volume':
      return 'sqft'; // Could be cubic feet, but using sqft for simplicity
    default:
      return 'sqft';
  }
}

// Helper function to get relevant measurement categories for selected services
export function getRelevantCategories(selectedServices: string[]): MeasurementCategory[] {
  const categories = new Set<MeasurementCategory>();
  
  Object.values(MEASUREMENT_TEMPLATES).forEach(template => {
    if (template.requiredFor.some(serviceId => selectedServices.includes(serviceId))) {
      categories.add(template.category);
    }
  });
  
  return Array.from(categories);
}

// Helper function to group categories by type
export function groupCategoriesByType(categories: MeasurementCategory[]): Record<string, MeasurementCategory[]> {
  const groups: Record<string, MeasurementCategory[]> = {
    glass: [],
    facade: [],
    surfaces: [],
    parking: [],
    specialized: []
  };
  
  categories.forEach(category => {
    if (category.startsWith('glass_')) {
      groups.glass.push(category);
    } else if (category.startsWith('facade_')) {
      groups.facade.push(category);
    } else if (category === 'flat_surface' || category === 'footprint') {
      groups.surfaces.push(category);
    } else if (category.startsWith('parking_')) {
      groups.parking.push(category);
    } else {
      groups.specialized.push(category);
    }
  });
  
  return groups;
}