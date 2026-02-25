const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  shop: {
    type: String, // x-shopify-shop-domain
    required: true,
    lowercase: true,
    index: true
  },
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  shopifyOrderId: {
    type: String,
    required: true
  },
  orderName: {
    type: String, // e.g. #1001
    required: true
  },
  email: {
    type: String,
    index: true
  },
  customerName: {
    type: String
  },
  currency: {
    type: String,
    required: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  total_price: {
    type: Number
  },
  subtotalPrice: {
    type: Number
  },
  taxPrice: {
    type: Number
  },
  financialStatus: {
    type: String
  },
  fulfillmentStatus: {
    type: String,
    default: null
  },
  createdAtShopify: {
    type: Date
  },
  updatedAtShopify: {
    type: Date
  },
  customer: {
    id: String,
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },
  shippingAddress: {
    name: String,
    address1: String,
    address2: String,
    city: String,
    province: String,
    zip: String,
    country: String,
    phone: String
  },
  billingAddress: {
    name: String,
    address1: String,
    address2: String,
    city: String,
    province: String,
    zip: String,
    country: String,
    phone: String
  },
  lineItems: [{
    id: String,
    title: String,
    sku: String,
    quantity: Number,
    price: Number,
    variantTitle: String,
    vendor: String,
    image: String
  }],
  discounts: [{
    code: String,
    amount: Number,
    type: String
  }],
  raw: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Upsert index (Isolated by merchantId if present)
OrderSchema.index({ merchantId: 1, shop: 1, shopifyOrderId: 1 }, { unique: true });
OrderSchema.index({ shop: 1, shopifyOrderId: 1 }); // Non-unique index for general lookups

// Sort index
OrderSchema.index({ shop: 1, createdAtShopify: -1 });

module.exports = mongoose.model('Order', OrderSchema);
