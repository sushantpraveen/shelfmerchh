const mongoose = require('mongoose');

const shopifyOrderSchema = new mongoose.Schema({
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
  shopifyOrderId: {
    type: String,
    required: true
  },
  orderName: String,
  orderNumber: Number,
  financialStatus: String,
  fulfillmentStatus: String,
  currency: String,
  totalPrice: String,
  customerEmail: String,
  createdAtShopify: Date,
  updatedAtShopify: Date,
  raw: {
    type: mongoose.Schema.Types.Mixed // Stores full JSON from Shopify
  }
}, { timestamps: true });

// Compound index for unique order per merchant and shop
shopifyOrderSchema.index({ merchantId: 1, shop: 1, shopifyOrderId: 1 }, { unique: true });
shopifyOrderSchema.index({ shop: 1 });

module.exports = mongoose.model('ShopifyOrder', shopifyOrderSchema);
