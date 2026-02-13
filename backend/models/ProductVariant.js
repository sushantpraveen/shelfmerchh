const mongoose = require('mongoose');

const ProductVariantSchema = new mongoose.Schema({
  // Reference to parent product
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true // Index for faster queries by product
  },
  
  // Variant identification
  id: { 
    type: String, 
    required: true,
    unique: true // Ensure variant IDs are unique across all products
  },
  
  // Variant attributes
  size: { 
    type: String, 
    required: true 
  },
  color: { 
    type: String, 
    required: true 
  },
  sku: { 
    type: String, 
    required: true,
    unique: true // SKUs must be unique
  },
  
  // Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for product + size + color (ensure uniqueness per product)
ProductVariantSchema.index({ productId: 1, size: 1, color: 1 }, { unique: true });

// Index for faster queries
ProductVariantSchema.index({ isActive: 1 });
ProductVariantSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ProductVariant', ProductVariantSchema);

