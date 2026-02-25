const axios = require('axios');
const ShopifyStore = require('../models/ShopifyStore');
const ShopifyOrder = require('../models/ShopifyOrder');
const ShopifyProduct = require('../models/ShopifyProduct');

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
const SYNC_MODE = process.env.SYNC_MODE || 'orders';

/**
 * Custom error class for Shopify API errors
 */
class ShopifyApiError extends Error {
  constructor(status, data, shop) {
    super(`Shopify API ${status}`);
    this.name = 'ShopifyApiError';
    this.shopifyStatus = status;
    this.shopifyData = data;
    this.shop = shop;
  }
}

/**
 * Helper: make a GET request to Shopify, forwarding clean errors
 */
const shopifyGet = async (url, token, params = {}) => {
  try {
    return await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json'
      },
      params
    });
  } catch (apiError) {
    const status = apiError.response?.status || 500;
    const data = apiError.response?.data || { errors: apiError.message };
    console.error(`[Shopify API] ${status} from ${url}:`, JSON.stringify(data));
    throw new ShopifyApiError(status, data, url);
  }
};

/**
 * Syncs products for a specific shop
 */
const syncProductsForShop = async (shop, merchantId = null) => {
  const shopClean = shop.toLowerCase();
  // If merchantId is provided, filter by it for strict isolation
  const query = { shop: shopClean, isActive: true };
  if (merchantId) query.merchantId = merchantId;

  const store = await ShopifyStore.findOne(query);
  if (!store) throw new Error(`Store ${shop} not found or inactive for this merchant`);

  const effectiveMerchantId = merchantId || store.merchantId;

  let minDate;
  if (store.lastSyncAt) {
    minDate = store.lastSyncAt;
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    minDate = d;
  }

  const url = `https://${shop}/admin/api/${API_VERSION}/products.json`;
  const params = {
    limit: 250,
    updated_at_min: minDate.toISOString()
  };

  console.log(`[Shopify Sync] Mode: products | Shop: ${shop} | Merchant: ${effectiveMerchantId} | Since: ${minDate.toISOString()}`);

  const response = await shopifyGet(url, store.accessToken, params);

  const products = response.data.products || [];
  let upsertedCount = 0;
  let maxUpdatedAt = store.lastSyncAt || new Date(0);

  for (const product of products) {
    const productUpdatedAt = new Date(product.updated_at);
    if (productUpdatedAt > maxUpdatedAt) {
      maxUpdatedAt = productUpdatedAt;
    }

    await ShopifyProduct.findOneAndUpdate(
      { 
        merchantId: effectiveMerchantId,
        shop: shopClean, 
        shopifyProductId: String(product.id) 
      },
      {
        $set: {
          merchantId: effectiveMerchantId,
          shop: shopClean,
          shopifyProductId: String(product.id),
          title: product.title,
          status: product.status,
          vendor: product.vendor,
          productType: product.product_type,
          handle: product.handle,
          updatedAtShopify: product.updated_at,
          createdAtShopify: product.created_at,
          raw: product
        }
      },
      { upsert: true, new: true }
    );
    upsertedCount++;
  }

  const newLastSync = products.length > 0 ? maxUpdatedAt : new Date();
  store.lastSyncAt = newLastSync;
  await store.save();

  console.log(`[SYNC RESULT]`, { shop: shopClean, mode: 'products', fetched: products.length, upserted: upsertedCount, collection: "ShopifyProduct" });
  return { shop: shopClean, mode: 'products', fetched: products.length, upserted: upsertedCount, updatedAtMin: minDate, newLastSync };
};

/**
 * Syncs orders for a specific shop
 */
const syncOrdersForShop = async (shop, merchantId = null) => {
  const shopClean = shop.toLowerCase();
  const query = { shop: shopClean, isActive: true };
  if (merchantId) query.merchantId = merchantId;

  const store = await ShopifyStore.findOne(query);
  if (!store) throw new Error(`Store ${shop} not found or inactive for this merchant`);

  const effectiveMerchantId = merchantId || store.merchantId;

  let minDate;
  if (store.lastSyncAt) {
    minDate = store.lastSyncAt;
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    minDate = d;
  }

  const url = `https://${shop}/admin/api/${API_VERSION}/orders.json`;
  const params = {
    status: 'any',
    limit: 50,
    order: 'updated_at asc',
    updated_at_min: minDate.toISOString()
  };

  console.log(`[Shopify Sync] Mode: orders | Shop: ${shop} | Merchant: ${effectiveMerchantId} | Since: ${minDate.toISOString()}`);

  const response = await shopifyGet(url, store.accessToken, params);

  const orders = response.data.orders || [];
  let upsertedCount = 0;
  let maxUpdatedAt = store.lastSyncAt || new Date(0);

  for (const order of orders) {
    const orderUpdatedAt = new Date(order.updated_at);
    if (orderUpdatedAt > maxUpdatedAt) {
      maxUpdatedAt = orderUpdatedAt;
    }

    await ShopifyOrder.findOneAndUpdate(
      { 
        merchantId: effectiveMerchantId,
        shop: shopClean, 
        shopifyOrderId: String(order.id) 
      },
      {
        $set: {
          merchantId: effectiveMerchantId,
          shop: shopClean,
          shopifyOrderId: String(order.id),
          orderName: order.name,
          orderNumber: order.order_number,
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          currency: order.currency,
          totalPrice: order.total_price,
          customerEmail: order.email || (order.customer && order.customer.email),
          createdAtShopify: order.created_at,
          updatedAtShopify: order.updated_at,
          raw: order
        }
      },
      { upsert: true, new: true }
    );
    upsertedCount++;
  }

  const newLastSync = orders.length > 0 ? maxUpdatedAt : new Date();
  store.lastSyncAt = newLastSync;
  await store.save();

  console.log(`[SYNC RESULT]`, { shop: shopClean, mode: 'orders', fetched: orders.length, upserted: upsertedCount, collection: "ShopifyOrder" });
  return { shop: shopClean, mode: 'orders', fetched: orders.length, upserted: upsertedCount, updatedAtMin: minDate, newLastSync };
};

/**
 * Routes to the correct sync based on SYNC_MODE env
 */
const syncForShop = async (shop, merchantId = null, mode = 'orders') => {
  if (mode === 'products') {
    return syncProductsForShop(shop, merchantId);
  }
  return syncOrdersForShop(shop, merchantId);
};

module.exports = {
  syncForShop,
  syncOrdersForShop,
  syncProductsForShop,
  ShopifyApiError,
  SYNC_MODE,
  API_VERSION
};
