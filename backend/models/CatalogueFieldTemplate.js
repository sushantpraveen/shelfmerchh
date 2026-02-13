const mongoose = require('mongoose');

const CatalogueFieldTemplateSchema = new mongoose.Schema({
  categoryId: {
    type: String,
    required: true,
  },
  subcategoryId: {
    type: String,
    default: null, // null means applies to all subcategories in this category
  },
  key: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'textarea', 'number', 'select'],
    required: true,
  },
  options: {
    type: [String],
    default: [], // For select type
  },
  required: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    default: '',
  },
  unit: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Compound unique index: same field key can't exist twice for same category/subcategory
CatalogueFieldTemplateSchema.index(
  { categoryId: 1, subcategoryId: 1, key: 1 },
  { unique: true }
);

module.exports = mongoose.model('CatalogueFieldTemplate', CatalogueFieldTemplateSchema);

