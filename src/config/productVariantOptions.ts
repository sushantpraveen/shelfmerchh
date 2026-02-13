/**
 * Product Variant Options Configuration
 * 
 * Defines size and color options for each category/subcategory.
 * This ensures variants are appropriate for the product type.
 */

import { CategoryId } from './productCategories';

export interface VariantOptions {
  sizes: string[];
  colors: string[];
  allowCustomSizes?: boolean; // If false, custom input is hidden
  allowCustomColors?: boolean; // If false, custom input is hidden
  sizeLabel?: string; // Custom label for size (e.g., "Capacity", "Dimensions")
  sizeHint?: string; // Helper text for custom size input
  colorHint?: string; // Helper text for custom color input
}

/**
 * Variant options by category and optional subcategory
 */
export const VARIANT_OPTIONS: Record<CategoryId, {
  default: VariantOptions;
  bySubcategory?: Record<string, VariantOptions>;
}> = {
  apparel: {
    default: {
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
      colors: [
        'White', 'Black', 'Navy', 'Red', 'Maroon', 'Gray', 'Charcoal', 'Silver',
        'Olive', 'Olive Drab', 'Forest Green', 'Royal Blue', 'Sky Blue', 'Burgundy', 
        'Pink', 'Yellow', 'Gold', 'Orange', 'Purple', 'Mint Green', 'Coral',
        'Beige-Gray', 'Tan', 'Burgundy', 'Crimson', 'Lavender', 'Teal'
      ],
      allowCustomSizes: true,
      allowCustomColors: true,
      sizeHint: 'Standard clothing sizes available. Add custom size if needed.',
      colorHint: 'Add custom PMS colors or special requests.',
    },
    bySubcategory: {
      'T-Shirt': {
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'],
        colors: [
          'White', 'Black', 'Navy', 'Red', 'Gray', 'Charcoal', 'Light Gray',
          'Royal Blue', 'Sky Blue', 'Forest Green', 'Maroon', 'Pink', 'Yellow',
          'Orange', 'Purple', 'Olive', 'Beige-Gray', 'Tan'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeHint: 'Add youth sizes or custom measurements if needed.',
      },
      'Hoodie': {
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
        colors: [
          'Black', 'Gray', 'Charcoal', 'Navy', 'Maroon', 'Forest Green', 
          'Olive', 'Burgundy', 'Beige-Gray'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
      },
      'Tank Top': {
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        colors: [
          'White', 'Black', 'Gray', 'Light Gray', 'Navy', 'Red', 
          'Pink', 'Sky Blue', 'Coral', 'Mint Green', 'Yellow'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
      },
    }
  },

  accessories: {
    default: {
      sizes: ['One Size'],
      colors: ['Black', 'Brown', 'Tan', 'Navy', 'Gray', 'Beige', 'Beige-Gray', 'Charcoal'],
      allowCustomSizes: true,
      allowCustomColors: true,
      sizeHint: 'Add specific dimensions or fit types.',
    },
    bySubcategory: {
      'Tote Bag': {
        sizes: ['Small', 'Medium', 'Large'],
        colors: [
          'Natural', 'Black', 'Navy', 'Gray', 'Olive', 'Burgundy', 
          'Beige-Gray', 'Tan', 'Cream', 'Charcoal'
        ],
        allowCustomColors: true,
        sizeLabel: 'Size',
      },
      'Cap': {
        sizes: ['One Size', 'Youth'],
        colors: [
          'Black', 'Navy', 'Gray', 'Charcoal', 'White', 'Red', 
          'Olive', 'Camo', 'Tan', 'Beige-Gray'
        ],
        allowCustomColors: true,
      },
      'Phone Cover': {
        sizes: ['iPhone 14', 'iPhone 14 Pro', 'iPhone 14 Pro Max', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'Samsung Galaxy S23', 'Samsung Galaxy S24'],
        colors: [
          'Clear', 'Black', 'White', 'Blue', 'Royal Blue', 'Red', 
          'Pink', 'Purple', 'Green', 'Gold', 'Silver', 'Rose Gold'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Model',
      },
      'Gaming Pad': {
        sizes: ['Small (9x7)', 'Medium (12x10)', 'Large (16x12)', 'XL (18x16)'],
        colors: ['Black', 'Gray', 'Charcoal', 'White', 'Blue', 'Red', 'Purple', 'Green'],
        allowCustomColors: true,
        sizeLabel: 'Size (inches)',
      },
      'Beanie': {
        sizes: ['One Size'],
        colors: [
          'Black', 'Gray', 'Charcoal', 'Navy', 'Burgundy', 'Olive', 
          'Maroon', 'Beige-Gray', 'Forest Green'
        ],
        allowCustomColors: true,
      },
    }
  },

  home: {
    default: {
      sizes: ['Standard'],
      colors: ['White', 'Black', 'Gray', 'Beige', 'Beige-Gray', 'Navy', 'Cream', 'Ivory'],
      allowCustomSizes: true,
      allowCustomColors: true,
      sizeHint: 'Add custom dimensions for home products.',
    },
    bySubcategory: {
      'Mug': {
        sizes: ['11oz', '15oz', '20oz'],
        colors: [
          'White', 'Black', 'Red', 'Blue', 'Royal Blue', 'Green', 
          'Yellow', 'Pink', 'Purple', 'Orange', 'Gray', 'Beige-Gray'
        ],
        allowCustomColors: true,
        sizeLabel: 'Capacity',
      },
      'Can': {
        sizes: ['12oz', '16oz', '20oz'],
        colors: [
          'White', 'Black', 'Silver', 'Blue', 'Red', 'Green', 
          'Pink', 'Purple', 'Gold', 'Teal'
        ],
        allowCustomColors: true,
        sizeLabel: 'Capacity',
      },
      'Cushion': {
        sizes: ['14x14', '16x16', '18x18', '20x20'],
        colors: [
          'White', 'Black', 'Gray', 'Light Gray', 'Beige', 'Beige-Gray', 
          'Navy', 'Red', 'Yellow', 'Green', 'Blue', 'Pink', 'Cream', 'Tan'
        ],
        allowCustomColors: true,
        sizeLabel: 'Size (inches)',
      },
      'Frame': {
        sizes: ['5x7', '8x10', '11x14', '16x20', '18x24'],
        colors: [
          'Black', 'White', 'Wood', 'Silver', 'Gold', 'Rose Gold', 
          'Bronze', 'Copper', 'Charcoal', 'Beige-Gray'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Frame Size',
      },
      'Coaster': {
        sizes: ['4x4', '4.5x4.5'],
        colors: [
          'White', 'Black', 'Cork', 'Wood', 'Gray', 'Beige-Gray', 
          'Tan', 'Natural', 'Slate'
        ],
        allowCustomColors: true,
        sizeLabel: 'Size (inches)',
      },
    }
  },

  print: {
    default: {
      sizes: ['Standard'],
      colors: ['Full Color'],
      allowCustomSizes: true,
      allowCustomColors: false,
    },
    bySubcategory: {
      'Business Card': {
        sizes: ['3.5x2', '3.5x2 (Rounded)', '2x3.5'],
        colors: ['Full Color', 'Black & White'],
        allowCustomSizes: true,
        allowCustomColors: false,
        sizeLabel: 'Size (inches)',
      },
      'Poster': {
        sizes: ['A4', 'A3', 'A2', 'A1', '11x17', '18x24', '24x36'],
        colors: ['Full Color', 'Black & White', 'Sepia'],
        allowCustomSizes: true,
        sizeLabel: 'Size',
      },
      'Sticker': {
        sizes: ['2x2', '3x3', '4x4', '6x6', 'Custom'],
        colors: ['Full Color', 'Single Color', 'Clear Background'],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Size (inches)',
      },
      'Flyer': {
        sizes: ['A4', 'A5', 'Letter (8.5x11)', 'Half Letter (5.5x8.5)'],
        colors: ['Full Color', 'Black & White'],
        allowCustomSizes: true,
        allowCustomColors: false,
        sizeLabel: 'Size',
        sizeHint: 'Add custom flyer dimensions.',
      },
      'Notebook': {
        sizes: ['A4', 'A5', 'A6', 'B5', 'Letter'],
        colors: ['White Pages', 'Cream Pages', 'Black Pages', 'Ivory', 'Beige-Gray'],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Size',
        sizeHint: 'Add custom notebook sizes.',
        colorHint: 'Add custom page colors (e.g., Grid, Dotted).',
      },
      'Banner': {
        sizes: ['2x4 ft', '3x6 ft', '4x8 ft', '5x10 ft'],
        colors: ['Full Color'],
        allowCustomSizes: true,
        sizeLabel: 'Size',
      },
      'Canvas': {
        sizes: ['8x10', '11x14', '16x20', '18x24', '24x36'],
        colors: ['Standard Canvas', 'Gallery Wrap'],
        allowCustomSizes: true,
        sizeLabel: 'Size (inches)',
      },
    }
  },

  packaging: {
    default: {
      sizes: ['Small', 'Medium', 'Large'],
      colors: ['White', 'Kraft', 'Black', 'Natural', 'Beige-Gray'],
      allowCustomSizes: true,
      allowCustomColors: true,
    },
    bySubcategory: {
      'Box': {
        sizes: ['4x4x4', '6x6x6', '8x8x8', '10x10x10', '12x12x12'],
        colors: [
          'White', 'Kraft', 'Natural', 'Black', 'Brown', 
          'Beige-Gray', 'Tan', 'Custom Printed'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Dimensions (inches)',
      },
      'Bottle': {
        sizes: ['50ml', '100ml', '250ml', '500ml', '1000ml'],
        colors: [
          'Clear', 'Amber', 'Blue', 'Cobalt Blue', 'Green', 
          'White', 'Black', 'Frosted'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Capacity',
      },
      'Pouch': {
        sizes: ['Small (4x6)', 'Medium (6x9)', 'Large (8x12)'],
        colors: [
          'Clear', 'White', 'Black', 'Kraft', 'Silver', 
          'Gold', 'Rose Gold', 'Beige-Gray'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Size',
      },
      'Tube': {
        sizes: ['2x12', '3x18', '4x24'],
        colors: ['White', 'Kraft', 'Natural', 'Black', 'Beige-Gray', 'Brown'],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Diameter x Length (inches)',
        sizeHint: 'Add custom tube dimensions.',
      },
    }
  },

  tech: {
    default: {
      sizes: ['Standard'],
      colors: ['Black', 'White', 'Clear', 'Blue', 'Red', 'Gray', 'Silver'],
      allowCustomSizes: true,
      allowCustomColors: true,
    },
    bySubcategory: {
      'IPhone': {
        sizes: [
          'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
          'iPhone 14', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
          'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max'
        ],
        colors: [
          'Clear', 'Black', 'White', 'Blue', 'Royal Blue', 'Navy', 'Red', 
          'Pink', 'Purple', 'Green', 'Yellow', 'Orange', 'Gray', 'Silver', 
          'Gold', 'Rose Gold', 'Beige-Gray'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Model',
      },
      'IPad': {
        sizes: [
          'iPad 10.2"', 'iPad Air 10.9"', 'iPad Pro 11"', 'iPad Pro 12.9"'
        ],
        colors: [
          'Clear', 'Black', 'White', 'Blue', 'Royal Blue', 'Navy', 'Red', 
          'Gray', 'Silver', 'Gold', 'Rose Gold'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Model',
      },
      'Macbook': {
        sizes: [
          'MacBook Air 13"', 'MacBook Pro 14"', 'MacBook Pro 16"'
        ],
        colors: [
          'Clear', 'Black', 'White', 'Blue', 'Gray', 'Silver', 
          'Charcoal', 'Beige-Gray', 'Rose Gold'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Model',
      },
      'Phone': {
        sizes: ['Small (5-6")', 'Medium (6-6.5")', 'Large (6.5"+)'],
        colors: [
          'Clear', 'Black', 'White', 'Blue', 'Red', 'Pink', 
          'Purple', 'Green', 'Gray', 'Silver'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Size',
      },
    }
  },

  jewelry: {
    default: {
      sizes: ['One Size', 'Adjustable'],
      colors: ['Silver', 'Gold', 'Rose Gold', 'White Gold', 'Black', 'Bronze', 'Copper'],
      allowCustomSizes: true,
      allowCustomColors: true,
    },
    bySubcategory: {
      'Ring': {
        sizes: ['5', '6', '7', '8', '9', '10', '11', 'Adjustable'],
        colors: [
          'Silver', 'Gold', 'Rose Gold', 'White Gold', 'Black', 
          'Bronze', 'Copper', 'Brass', 'Platinum'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Ring Size',
      },
      'Necklace': {
        sizes: ['14"', '16"', '18"', '20"', '22"', '24"', 'Adjustable'],
        colors: [
          'Silver', 'Gold', 'Rose Gold', 'White Gold', 'Black', 
          'Bronze', 'Copper', 'Brass'
        ],
        allowCustomSizes: true,
        allowCustomColors: true,
        sizeLabel: 'Chain Length',
      },
      'Earring': {
        sizes: ['Small', 'Medium', 'Large'],
        colors: [
          'Silver', 'Gold', 'Rose Gold', 'White Gold', 'Black', 
          'Bronze', 'Copper'
        ],
        allowCustomColors: true,
        sizeLabel: 'Size',
      },
    }
  }
};

/**
 * Get variant options for a specific category and subcategory
 */
export const getVariantOptions = (
  categoryId: CategoryId,
  subcategoryId?: string
): VariantOptions => {
  const categoryOptions = VARIANT_OPTIONS[categoryId];
  
  if (!categoryOptions) {
    // Fallback to generic options
    return {
      sizes: ['One Size'],
      colors: ['Default'],
      allowCustomSizes: true,
      allowCustomColors: true,
    };
  }

  // If subcategory is provided and has specific options, use those
  if (subcategoryId && categoryOptions.bySubcategory?.[subcategoryId]) {
    return categoryOptions.bySubcategory[subcategoryId];
  }

  // Otherwise use default for the category
  return categoryOptions.default;
};

/**
 * Color utilities - Re-exported from centralized color map
 */
export { getColorHex, COLOR_MAP as COLOR_HEX_MAP } from '@/utils/colorMap';

