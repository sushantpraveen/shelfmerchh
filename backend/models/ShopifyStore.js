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
    default: null
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
  uninstalledAt: {
    type: Date,
    default: null
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
    index: true,
    default: null
  }
}, {
  timestamps: true
});

// One record per shop (unique)
ShopifyStoreSchema.index({ shop: 1 }, { unique: true });

module.exports = mongoose.model('ShopifyStore', ShopifyStoreSchema);
