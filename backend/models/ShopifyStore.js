const mongoose = require('mongoose');

const ShopifyStoreSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  accessToken: {
    type: String,
    required: true
  },
  scopes: {
    type: [String],
    default: []
  },
  scope: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  installedAt: {
    type: Date,
    default: Date.now
  },
  webhookIds: {
    type: Map,
    of: String,
    default: {}
  },
  lastWebhookSyncAt: {
    type: Date
  },
  lastSyncAt: {
    type: Date,
    default: null
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate stores per merchant
ShopifyStoreSchema.index({ merchantId: 1, shop: 1 }, { unique: true });

// Index on shop for faster lookups (non-unique to allow multiple merchants to connect same store if needed)
ShopifyStoreSchema.index({ shop: 1 });

module.exports = mongoose.model('ShopifyStore', ShopifyStoreSchema);
