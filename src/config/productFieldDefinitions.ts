/**
 * Product Field Definitions Configuration
 * 
 * This file defines which attributes are available for each category/subcategory combination.
 * Fields are rendered dynamically based on these definitions.
 * Admins cannot add/remove fields at runtime - they are static in code.
 */

import { CategoryId } from './productCategories';

export type FieldType = 'text' | 'number' | 'select' | 'textarea';

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[]; // For select fields
  unit?: string; // For display purposes (e.g., "gsm", "oz", "mm")
}

/**
 * Field definitions by category
 * Each category can have common fields that apply to all subcategories
 * and specific fields for certain subcategories
 */
export const FIELD_DEFINITIONS: Record<CategoryId, {
  common: FieldDefinition[];
  bySubcategory?: Record<string, FieldDefinition[]>;
}> = {
  apparel: {
    common: [
      { key: 'gender', label: 'Target Audience', type: 'select', options: ['Men', 'Women', 'Kids', 'Unisex'], required: true },
      { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g., 100% Cotton' },
      { key: 'gsm', label: 'GSM', type: 'text', placeholder: 'e.g., 180', unit: 'g/m²' },
      { key: 'fit', label: 'Fit', type: 'select', options: ['Regular', 'Oversized', 'Slim'] },
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Enter brand name' },
      { key: 'fabricComposition', label: 'Fabric Composition', type: 'text', placeholder: 'e.g., 60% Cotton, 40% Polyester' },
    ],
    bySubcategory: {
      'T-Shirt': [
        { key: 'collarType', label: 'Collar Type', type: 'select', options: ['Crew Neck', 'V-Neck', 'Polo', 'Henley'] },
        { key: 'sleeveLength', label: 'Sleeve Length', type: 'select', options: ['Short Sleeve', 'Long Sleeve', '3/4 Sleeve'] },
      ],
      'Hoodie': [
        { key: 'hoodType', label: 'Hood Type', type: 'select', options: ['Pullover', 'Zip-up', 'Half-Zip'] },
        { key: 'pocketStyle', label: 'Pocket Style', type: 'select', options: ['Kangaroo', 'Side Pockets', 'No Pockets'] },
      ],
      'Jersey': [
        { key: 'neckline', label: 'Neckline', type: 'text', placeholder: 'e.g., V-Neck, Round Neck' },
        { key: 'sleeveLength', label: 'Sleeve Length', type: 'select', options: ['Short Sleeve', 'Long Sleeve', 'Sleeveless'] },
      ],
    }
  },
  accessories: {
    common: [
      { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g., Canvas, Leather' },
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Enter brand name' },
    ],
    bySubcategory: {
      'Tote Bag': [
        { key: 'capacity', label: 'Capacity', type: 'text', placeholder: 'e.g., 15L', unit: 'L' },
        { key: 'handleType', label: 'Handle Type', type: 'select', options: ['Short', 'Long', 'Adjustable'] },
      ],
      'Cap': [
        { key: 'capStyle', label: 'Cap Style', type: 'select', options: ['Snapback', 'Dad Hat', 'Trucker', 'Fitted'] },
        { key: 'visorType', label: 'Visor Type', type: 'select', options: ['Curved', 'Flat'] },
      ],
      'Phone Cover': [
        { key: 'compatibility', label: 'Compatibility', type: 'text', placeholder: 'e.g., iPhone 14 Pro', required: true },
        { key: 'caseType', label: 'Case Type', type: 'select', options: ['Soft', 'Hard', 'Hybrid'] },
      ],
    }
  },
  home: {
    common: [
      { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g., Ceramic, Glass' },
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Enter brand name' },
    ],
    bySubcategory: {
      'Mug': [
        { key: 'capacity', label: 'Capacity', type: 'text', placeholder: 'e.g., 11oz, 15oz', unit: 'oz' },
        { key: 'dishwasherSafe', label: 'Dishwasher Safe', type: 'select', options: ['Yes', 'No'] },
        { key: 'microwaveSafe', label: 'Microwave Safe', type: 'select', options: ['Yes', 'No'] },
      ],
      'Cushion': [
        { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g., 18x18 inches' },
        { key: 'fillMaterial', label: 'Fill Material', type: 'text', placeholder: 'e.g., Polyester fiber' },
      ],
      'Frame': [
        { key: 'frameSize', label: 'Frame Size', type: 'text', placeholder: 'e.g., 8x10, 11x14', required: true },
        { key: 'frameMaterial', label: 'Frame Material', type: 'select', options: ['Wood', 'Metal', 'Plastic'] },
      ],
    }
  },
  print: {
    common: [
      { key: 'paperType', label: 'Paper Type', type: 'text', placeholder: 'e.g., Matte, Glossy' },
      { key: 'paperWeight', label: 'Paper Weight', type: 'text', placeholder: 'e.g., 300gsm', unit: 'gsm' },
    ],
    bySubcategory: {
      'Business Card': [
        { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g., 3.5x2 inches', required: true },
        { key: 'finish', label: 'Finish', type: 'select', options: ['Matte', 'Glossy', 'Textured', 'Spot UV'] },
        { key: 'corners', label: 'Corners', type: 'select', options: ['Square', 'Rounded'] },
      ],
      'Poster': [
        { key: 'size', label: 'Size', type: 'select', options: ['A4', 'A3', 'A2', 'A1', '18x24', '24x36'], required: true },
        { key: 'finish', label: 'Finish', type: 'select', options: ['Matte', 'Glossy', 'Satin'] },
      ],
      'Sticker': [
        { key: 'stickerType', label: 'Sticker Type', type: 'select', options: ['Die Cut', 'Kiss Cut', 'Sheet'], required: true },
        { key: 'finish', label: 'Finish', type: 'select', options: ['Matte', 'Glossy', 'Clear'] },
        { key: 'waterproof', label: 'Waterproof', type: 'select', options: ['Yes', 'No'] },
      ],
      'Notebook': [
        { key: 'pageCount', label: 'Page Count', type: 'number', placeholder: 'e.g., 100' },
        { key: 'binding', label: 'Binding', type: 'select', options: ['Spiral', 'Perfect Bound', 'Saddle Stitch'] },
        { key: 'ruling', label: 'Ruling', type: 'select', options: ['Lined', 'Blank', 'Grid', 'Dotted'] },
      ],
    }
  },
  packaging: {
    common: [
      { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g., Cardboard, Plastic' },
      { key: 'recyclable', label: 'Recyclable', type: 'select', options: ['Yes', 'No', 'Partially'] },
    ],
    bySubcategory: {
      'Box': [
        { key: 'boxType', label: 'Box Type', type: 'select', options: ['Mailer', 'Gift', 'Shipping', 'Display'] },
        { key: 'dimensions', label: 'Dimensions', type: 'text', placeholder: 'e.g., 10x8x4 inches', required: true },
      ],
      'Bottle': [
        { key: 'capacity', label: 'Capacity', type: 'text', placeholder: 'e.g., 500ml', unit: 'ml', required: true },
        { key: 'capType', label: 'Cap Type', type: 'select', options: ['Screw Cap', 'Flip Top', 'Pump', 'Spray'] },
      ],
      'Pouch': [
        { key: 'pouchType', label: 'Pouch Type', type: 'select', options: ['Stand-up', 'Flat', 'Gusseted', 'Zipper'] },
        { key: 'capacity', label: 'Capacity', type: 'text', placeholder: 'e.g., 250g' },
      ],
    }
  },
  tech: {
    common: [
      { key: 'brand', label: 'Brand', type: 'text', placeholder: 'Enter brand name' },
      { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g., Silicone, Polycarbonate' },
    ],
    bySubcategory: {
      'IPhone': [
        { key: 'model', label: 'Model', type: 'text', placeholder: 'e.g., iPhone 14 Pro Max', required: true },
        { key: 'caseType', label: 'Case Type', type: 'select', options: ['Slim', 'Rugged', 'Wallet', 'Clear'] },
        { key: 'protection', label: 'Protection Level', type: 'select', options: ['Basic', 'Military Grade', 'Shockproof'] },
      ],
      'Macbook': [
        { key: 'model', label: 'Model', type: 'text', placeholder: 'e.g., MacBook Pro 14"', required: true },
        { key: 'accessoryType', label: 'Accessory Type', type: 'select', options: ['Case', 'Sleeve', 'Skin', 'Cover'] },
      ],
      'IPad': [
        { key: 'model', label: 'Model', type: 'text', placeholder: 'e.g., iPad Pro 11"', required: true },
        { key: 'caseType', label: 'Case Type', type: 'select', options: ['Folio', 'Back Cover', 'Keyboard Case', 'Rugged'] },
      ],
    }
  },
  jewelry: {
    common: [
      { key: 'material', label: 'Material', type: 'text', placeholder: 'e.g., Sterling Silver, Gold Plated', required: true },
      { key: 'finish', label: 'Finish', type: 'select', options: ['Polished', 'Brushed', 'Matte', 'Oxidized'] },
      { key: 'hypoallergenic', label: 'Hypoallergenic', type: 'select', options: ['Yes', 'No'] },
    ],
    bySubcategory: {
      'Ring': [
        { key: 'ringSize', label: 'Ring Size', type: 'text', placeholder: 'e.g., Adjustable, Size 7' },
        { key: 'bandWidth', label: 'Band Width', type: 'text', placeholder: 'e.g., 3mm', unit: 'mm' },
      ],
      'Necklace': [
        { key: 'chainLength', label: 'Chain Length', type: 'text', placeholder: 'e.g., 18 inches', unit: 'inches' },
        { key: 'chainType', label: 'Chain Type', type: 'select', options: ['Cable', 'Box', 'Rope', 'Snake', 'Curb'] },
        { key: 'claspType', label: 'Clasp Type', type: 'select', options: ['Lobster', 'Spring Ring', 'Magnetic', 'Toggle'] },
      ],
      'Earring': [
        { key: 'earringType', label: 'Earring Type', type: 'select', options: ['Stud', 'Hoop', 'Drop', 'Dangle', 'Huggie'] },
        { key: 'backingType', label: 'Backing Type', type: 'select', options: ['Push Back', 'Screw Back', 'Leverback', 'Fish Hook'] },
      ],
    }
  }
};

/**
 * Get field definitions for a specific category and subcategory combination
 */
export const getFieldDefinitions = (categoryId: CategoryId, subcategoryIds: string[]): FieldDefinition[] => {
  const categoryDef = FIELD_DEFINITIONS[categoryId];
  if (!categoryDef) return [];

  // Start with common fields
  const fields = [...categoryDef.common];

  // Add subcategory-specific fields
  if (categoryDef.bySubcategory) {
    subcategoryIds.forEach(subcategoryId => {
      const subcategoryFields = categoryDef.bySubcategory?.[subcategoryId];
      if (subcategoryFields) {
        fields.push(...subcategoryFields);
      }
    });
  }

  return fields;
};

/**
 * Get default values for attributes based on field definitions
 */
export const getDefaultAttributes = (fields: FieldDefinition[]): Record<string, any> => {
  const defaults: Record<string, any> = {};
  fields.forEach(field => {
    if (field.type === 'select' && field.options && field.options.length > 0) {
      defaults[field.key] = field.options[0];
    } else if (field.type === 'number') {
      defaults[field.key] = 0;
    } else {
      defaults[field.key] = '';
    }
  });
  return defaults;
};

