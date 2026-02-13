/**
 * Product Field Definitions Configuration
 * 
 * This file defines which attributes are available for each category/subcategory combination.
 * This mirrors the frontend configuration and can be used for backend validation.
 * Admins cannot add/remove fields at runtime - they are static in code.
 */

/**
 * Field definitions by category
 * Each category can have common fields that apply to all subcategories
 * and specific fields for certain subcategories
 */
const FIELD_DEFINITIONS = {
  apparel: {
    common: [
      { key: 'gender', label: 'Target Audience', type: 'select', options: ['Men', 'Women', 'Kids', 'Unisex'], required: true },
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'gsm', label: 'GSM', type: 'text' },
      { key: 'fit', label: 'Fit', type: 'select', options: ['Regular', 'Oversized', 'Slim'] },
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'fabricComposition', label: 'Fabric Composition', type: 'text' },
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
        { key: 'neckline', label: 'Neckline', type: 'text' },
        { key: 'sleeveLength', label: 'Sleeve Length', type: 'select', options: ['Short Sleeve', 'Long Sleeve', 'Sleeveless'] },
      ],
    }
  },
  accessories: {
    common: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
    ],
    bySubcategory: {
      'Tote Bag': [
        { key: 'capacity', label: 'Capacity', type: 'text' },
        { key: 'handleType', label: 'Handle Type', type: 'select', options: ['Short', 'Long', 'Adjustable'] },
      ],
      'Cap': [
        { key: 'capStyle', label: 'Cap Style', type: 'select', options: ['Snapback', 'Dad Hat', 'Trucker', 'Fitted'] },
        { key: 'visorType', label: 'Visor Type', type: 'select', options: ['Curved', 'Flat'] },
      ],
      'Phone Cover': [
        { key: 'compatibility', label: 'Compatibility', type: 'text', required: true },
        { key: 'caseType', label: 'Case Type', type: 'select', options: ['Soft', 'Hard', 'Hybrid'] },
      ],
    }
  },
  home: {
    common: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'brand', label: 'Brand', type: 'text' },
    ],
    bySubcategory: {
      'Mug': [
        { key: 'capacity', label: 'Capacity', type: 'text' },
        { key: 'dishwasherSafe', label: 'Dishwasher Safe', type: 'select', options: ['Yes', 'No'] },
        { key: 'microwaveSafe', label: 'Microwave Safe', type: 'select', options: ['Yes', 'No'] },
      ],
      'Cushion': [
        { key: 'dimensions', label: 'Dimensions', type: 'text' },
        { key: 'fillMaterial', label: 'Fill Material', type: 'text' },
      ],
      'Frame': [
        { key: 'frameSize', label: 'Frame Size', type: 'text', required: true },
        { key: 'frameMaterial', label: 'Frame Material', type: 'select', options: ['Wood', 'Metal', 'Plastic'] },
      ],
    }
  },
  print: {
    common: [
      { key: 'paperType', label: 'Paper Type', type: 'text' },
      { key: 'paperWeight', label: 'Paper Weight', type: 'text' },
    ],
    bySubcategory: {
      'Business Card': [
        { key: 'dimensions', label: 'Dimensions', type: 'text', required: true },
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
        { key: 'pageCount', label: 'Page Count', type: 'number' },
        { key: 'binding', label: 'Binding', type: 'select', options: ['Spiral', 'Perfect Bound', 'Saddle Stitch'] },
        { key: 'ruling', label: 'Ruling', type: 'select', options: ['Lined', 'Blank', 'Grid', 'Dotted'] },
      ],
    }
  },
  packaging: {
    common: [
      { key: 'material', label: 'Material', type: 'text' },
      { key: 'recyclable', label: 'Recyclable', type: 'select', options: ['Yes', 'No', 'Partially'] },
    ],
    bySubcategory: {
      'Box': [
        { key: 'boxType', label: 'Box Type', type: 'select', options: ['Mailer', 'Gift', 'Shipping', 'Display'] },
        { key: 'dimensions', label: 'Dimensions', type: 'text', required: true },
      ],
      'Bottle': [
        { key: 'capacity', label: 'Capacity', type: 'text', required: true },
        { key: 'capType', label: 'Cap Type', type: 'select', options: ['Screw Cap', 'Flip Top', 'Pump', 'Spray'] },
      ],
      'Pouch': [
        { key: 'pouchType', label: 'Pouch Type', type: 'select', options: ['Stand-up', 'Flat', 'Gusseted', 'Zipper'] },
        { key: 'capacity', label: 'Capacity', type: 'text' },
      ],
    }
  },
  tech: {
    common: [
      { key: 'brand', label: 'Brand', type: 'text' },
      { key: 'material', label: 'Material', type: 'text' },
    ],
    bySubcategory: {
      'IPhone': [
        { key: 'model', label: 'Model', type: 'text', required: true },
        { key: 'caseType', label: 'Case Type', type: 'select', options: ['Slim', 'Rugged', 'Wallet', 'Clear'] },
        { key: 'protection', label: 'Protection Level', type: 'select', options: ['Basic', 'Military Grade', 'Shockproof'] },
      ],
      'Macbook': [
        { key: 'model', label: 'Model', type: 'text', required: true },
        { key: 'accessoryType', label: 'Accessory Type', type: 'select', options: ['Case', 'Sleeve', 'Skin', 'Cover'] },
      ],
      'IPad': [
        { key: 'model', label: 'Model', type: 'text', required: true },
        { key: 'caseType', label: 'Case Type', type: 'select', options: ['Folio', 'Back Cover', 'Keyboard Case', 'Rugged'] },
      ],
    }
  },
  jewelry: {
    common: [
      { key: 'material', label: 'Material', type: 'text', required: true },
      { key: 'finish', label: 'Finish', type: 'select', options: ['Polished', 'Brushed', 'Matte', 'Oxidized'] },
      { key: 'hypoallergenic', label: 'Hypoallergenic', type: 'select', options: ['Yes', 'No'] },
    ],
    bySubcategory: {
      'Ring': [
        { key: 'ringSize', label: 'Ring Size', type: 'text' },
        { key: 'bandWidth', label: 'Band Width', type: 'text' },
      ],
      'Necklace': [
        { key: 'chainLength', label: 'Chain Length', type: 'text' },
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
const getFieldDefinitions = (categoryId, subcategoryIds = []) => {
  const categoryDef = FIELD_DEFINITIONS[categoryId];
  if (!categoryDef) return [];

  // Start with common fields
  const fields = [...categoryDef.common];

  // Add subcategory-specific fields
  if (categoryDef.bySubcategory) {
    subcategoryIds.forEach(subcategoryId => {
      const subcategoryFields = categoryDef.bySubcategory[subcategoryId];
      if (subcategoryFields) {
        fields.push(...subcategoryFields);
      }
    });
  }

  return fields;
};

/**
 * Validate attributes against field definitions
 * Returns an array of validation errors
 */
const validateAttributes = (categoryId, subcategoryIds, attributes) => {
  const errors = [];
  const fieldDefs = getFieldDefinitions(categoryId, subcategoryIds);

  fieldDefs.forEach(field => {
    const value = attributes[field.key];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label} is required`);
    }

    // Validate select options
    if (field.type === 'select' && value && field.options) {
      if (!field.options.includes(value)) {
        errors.push(`${field.label} must be one of: ${field.options.join(', ')}`);
      }
    }

    // Validate number type
    if (field.type === 'number' && value !== undefined && value !== null && value !== '') {
      if (isNaN(value)) {
        errors.push(`${field.label} must be a number`);
      }
    }
  });

  return errors;
};

module.exports = {
  FIELD_DEFINITIONS,
  getFieldDefinitions,
  validateAttributes
};

