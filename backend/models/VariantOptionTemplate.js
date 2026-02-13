const mongoose = require('mongoose');

/**
 * VariantOptionTemplate Model
 * 
 * Stores custom variant options (sizes/colors) that admins add globally.
 * These options are merged with the static config options and shown as checkboxes.
 */

const VariantOptionTemplateSchema = new mongoose.Schema({
  categoryId: {
    type: String,
    required: true,
    enum: ['apparel', 'accessories', 'home', 'print', 'packaging', 'tech', 'jewelry']
  },
  subcategoryId: {
    type: String,
    default: null // null means it applies to all subcategories in the category
  },
  optionType: {
    type: String,
    required: true,
    enum: ['size', 'color']
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  colorHex: {
    type: String,
    default: null // For color options, store the hex value for display
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usageCount: {
    type: Number,
    default: 0 // Track how many products use this option
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate options
VariantOptionTemplateSchema.index({ 
  categoryId: 1, 
  subcategoryId: 1, 
  optionType: 1, 
  value: 1 
}, { unique: true });

// Index for querying
VariantOptionTemplateSchema.index({ categoryId: 1, optionType: 1 });
VariantOptionTemplateSchema.index({ isActive: 1 });

module.exports = mongoose.model('VariantOptionTemplate', VariantOptionTemplateSchema);

