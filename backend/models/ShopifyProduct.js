const mongoose = require('mongoose');

const shopifyProductSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
    index: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  shopifyProductId: {
    type: String,
    required: true
  },
  title: String,
  status: String,
  vendor: String,
  productType: String,
  handle: String,
  updatedAtShopify: Date,
  createdAtShopify: Date,
  raw: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

shopifyProductSchema.index({ merchantId: 1, shop: 1, shopifyProductId: 1 }, { unique: true });
shopifyProductSchema.index({ shop: 1 });

module.exports = mongoose.model('ShopifyProduct', shopifyProductSchema);
