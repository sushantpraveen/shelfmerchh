const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const { verifyShopifyOAuth, verifyShopifyWebhook } = require('../utils/shopifyUtils');
const ShopifyStore = require('../models/ShopifyStore');
const WebhookEvent = require('../models/WebhookEvent');
const Order = require('../models/Order');
const ShopifyOrder = require('../models/ShopifyOrder');
const ShopifyProduct = require('../models/ShopifyProduct');
const { protect } = require('../middleware/auth');
const { requireStoreOwnership } = require('../middleware/requireStoreOwnership');
const { syncForShop, ShopifyApiError, SYNC_MODE } = require('../services/shopifySync');

// Bulletproof Shop Sanitization
const sanitizeShop = (shop) => {
  if (!shop || typeof shop !== 'string') return null;
  let s = shop.trim().toLowerCase();
  
  // Remove protocols and trailing slashes
  s = s.replace(/^https?:\/\//, '').replace(/\/$/, '');
  
  // Extract handle if full domain or subpath is provided
  // Example: "hzchtm-np.myshopify.com" -> ["hzchtm-np"]
  // Example: "hzchtm-np" -> ["hzchtm-np"]
  const parts = s.split('.myshopify.com');
  const handle = parts[0].split('/').pop(); 
  
  if (!handle) return null;
  return `${handle}.myshopify.com`;
};

// Helper: Forward ShopifyApiError cleanly to client
const handleShopifyError = (error, res) => {
  if (error instanceof ShopifyApiError) {
    return res.status(error.shopifyStatus).json({
      success: false,
      source: 'shopify',
      status: error.shopifyStatus,
      data: error.shopifyData
    });
  }
  console.error('[Shopify Error]', error.message);
  return res.status(500).json({ success: false, message: error.message });
};

/**
 * Register a webhook using Shopify Admin REST API
 */
async function registerShopifyWebhook(shop, accessToken, topic, address) {
  try {
    const url = `https://${shop}/admin/api/2024-01/webhooks.json`;
    const response = await axios.post(
      url,
      {
        webhook: {
          topic: topic,
          address: address,
          format: 'json'
        }
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[Shopify Webhook] Registered ${topic} for ${shop}:`, response.data.webhook.id);
    return response.data.webhook.id;
  } catch (error) {
    console.error(`[Shopify Webhook Error] Failed to register ${topic} for ${shop}:`, error.response?.data || error.message);
    return null;
  }
}

const jwt = require('jsonwebtoken');

// @route   GET /api/shopify/start
// @desc    Step 1: Start Shopify OAuth. Token is OPTIONAL (Qikink flow: install before login).
router.get('/start', async (req, res) => {
  try {
    const { shop, token } = req.query;
    const sanitizedShop = sanitizeShop(shop);

    if (!sanitizedShop) {
      return res.status(400).send('Invalid or missing shop parameter');
    }

    // Token is OPTIONAL — if provided, decode and set merchant_id cookie
    let merchantId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        merchantId = decoded.id || decoded._id;
      } catch (err) {
        console.log('[Shopify START] Invalid token provided, proceeding without merchant context');
      }
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const publicBase = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const redirectUri = encodeURIComponent(`${publicBase}/api/shopify/callback`);

    const authorizeUrl = `https://${sanitizedShop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${encodeURIComponent(process.env.SHOPIFY_SCOPES)}&redirect_uri=${redirectUri}&state=${nonce}&shop=${sanitizedShop}`;

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      signed: true
    };

    // Always set state cookie
    res.cookie('shopify_state', nonce, { ...cookieOptions, maxAge: 15 * 60 * 1000 });

    // Only set merchant cookie if we have a valid token
    if (merchantId) {
      res.cookie('merchant_id', merchantId.toString(), { ...cookieOptions, maxAge: 60 * 60 * 1000 });
    }

    console.log('[Shopify OAuth] Redirecting to:', authorizeUrl, '| merchantId:', merchantId || 'none');

    res.redirect(normalizeUrl(authorizeUrl));
  } catch (error) {
    console.error('[Shopify START ERROR]', error);
    res.status(500).send('Failed to initiate Shopify connection.');
  }
});

// Helper to ensure URL is clean for res.redirect
function normalizeUrl(url) {
  return url.replace(/([^:]\/)\/+/g, "$1");
}

// @route   GET /api/shopify/callback
// @desc    Step 2: Handle Shopify OAuth callback. merchantId cookie is OPTIONAL.
router.get('/callback', async (req, res) => {
  const { shop, code, state, host } = req.query;
  const sanitizedShop = sanitizeShop(shop);

  // Read state cookie (required)
  const cookieState = req.signedCookies.shopify_state || req.cookies.shopify_state;

  // Validate state cookie (HMAC protection).
  if (!state || !cookieState || state !== cookieState) {
    console.log('[Shopify CALLBACK FAIL] state mismatch', { state, cookieState });
    return res.status(403).send('Request origin could not be verified. Please try again.');
  }

  try {
    const rawQuery = req.originalUrl.split('?')[1] || '';
    if (!verifyShopifyOAuth(req.query, process.env.SHOPIFY_API_SECRET, rawQuery)) {
      return res.status(400).send('HMAC verification failed');
    }

    const tokenResponse = await axios.post(`https://${sanitizedShop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code
    });

    const { access_token, scope } = tokenResponse.data;

    // UPSERT by shop ONLY (one record per shop)
    const updateData = {
      merchantId: null, // ensure not linked after install
      accessToken: access_token,
      scope: scope,
      scopes: scope ? scope.split(',') : [],
      isActive: true,
      installedAt: new Date(),
      uninstalledAt: null
    };

    const store = await ShopifyStore.findOneAndUpdate(
      { shop: sanitizedShop },
      { $set: updateData },
      { upsert: true, new: true }
    );

    console.log(`[Shopify Callback] Installed shop=${sanitizedShop}`);

    // REGISTER WEBHOOKS (Step-5)
    try {
      const publicBase = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
      const webhookAddress = `${publicBase}/api/shopify/webhooks/app-uninstalled`;
      const webhookId = await registerShopifyWebhook(sanitizedShop, access_token, 'app/uninstalled', webhookAddress);
      
      if (webhookId) {
        if (!store.webhookIds) store.webhookIds = new Map();
        store.webhookIds.set('app_uninstalled', webhookId.toString());
        await store.save();
      }
    } catch (whErr) {
      console.error('[Shopify Callback] Webhook registration failed:', whErr.message);
    }

    res.clearCookie('shopify_state', { path: '/', signed: true });
    res.clearCookie('merchant_id', { path: '/', signed: true });

    // Redirect to Embedded App Page, preserving host if available
    const appBase = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');
    let redirectUrl = `${appBase}/shopify/app?shop=${sanitizedShop}`;
    if (host) redirectUrl += `&host=${encodeURIComponent(host)}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error(`[Shopify Callback Error] ${sanitizedShop}:`, error.response?.data || error.message);
    res.status(500).send('Authentication failed.');
  }
});

// @route   POST /api/shopify/link-account
// @desc    Step 3: Link ShelfMerch account to the installed Shopify store
router.post('/link-account', protect, async (req, res) => {
  try {
    const shop = req.body?.shop;

    if (!shop || typeof shop !== 'string' || !shop.endsWith('.myshopify.com')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shop domain. Must be a valid .myshopify.com domain.'
      });
    }

    const sanitizedShop = sanitizeShop(shop);

    // Find installed store: must have accessToken and be active
    const store = await ShopifyStore.findOne({
      shop: sanitizedShop,
      isActive: true,
      accessToken: { $exists: true, $ne: null }
    });

    if (!store) {
      return res.status(400).json({
        success: false,
        message: 'Store not installed yet. Please install the app from Shopify first.'
      });
    }

    // Link the shop to the logged-in merchant
    store.merchantId = req.user._id;
    await store.save();

    console.log(`[Shopify Link] Linked shop ${sanitizedShop} to merchant ${req.user._id}`);
    res.json({ success: true, shop: sanitizedShop, linked: true });
  } catch (error) {
    console.error('[Shopify Link Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/shopify/status
// @desc    Check install/link status for a shop (public, no auth required)
router.get('/status', async (req, res) => {
  try {
    const { shop } = req.query;
    const sanitizedShop = sanitizeShop(shop);

    if (!sanitizedShop) {
      return res.status(400).json({ success: false, message: 'Invalid or missing shop parameter' });
    }

    const store = await ShopifyStore.findOne({ shop: sanitizedShop });

    const installed = !!(store && store.isActive && store.accessToken);
    const linked = !!(installed && store.merchantId);

    // Build authUrl for OAuth start (token optional)
    const publicBase = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const authUrl = `${publicBase}/api/shopify/start?shop=${encodeURIComponent(sanitizedShop)}`;

    res.json({
      success: true,
      shop: sanitizedShop,
      installed,
      linked,
      authUrl: installed ? undefined : authUrl
    });
  } catch (error) {
    console.error('[Shopify Status Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/shopify/stores
// @desc    List merchant's connected stores (PROTECTED)
router.get('/stores', protect, async (req, res) => {
  try {
    const filter = {
      merchantId: req.user._id,
      shop: { $exists: true, $ne: '' },
      accessToken: { $exists: true, $ne: null }
    };
    const stores = await ShopifyStore.find(filter)
      .select('shop isActive lastSyncAt scopes scope createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.set('Cache-Control', 'no-store');
    res.json({ success: true, count: stores.length, stores });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/shopify/orders
router.get('/orders', protect, requireStoreOwnership, async (req, res) => {
  try {
    const orders = await ShopifyOrder.find({ shop: req.query.shop }).sort({ updatedAtShopify: -1 }).limit(100);
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    handleShopifyError(error, res);
  }
});

// @route   POST /api/shopify/sync/orders
router.post('/sync/orders', protect, requireStoreOwnership, async (req, res) => {
  try {
    const shop = req.query.shop;
    const mode = req.query.mode || 'orders';
    console.log("[SYNC ROUTE]", { shop, mode, merchantId: req.user._id });
    
    const result = await syncForShop(shop, req.user._id, mode);
    res.json({ success: true, ...result });
  } catch (error) {
    handleShopifyError(error, res);
  }
});

// @route   POST /api/shopify/stores/:shop/sync
router.post('/stores/:shop/sync', protect, requireStoreOwnership, async (req, res) => {
  try {
    const shop = req.params.shop;
    const mode = req.query.mode || 'orders';
    console.log("[SYNC ROUTE]", { shop, mode, merchantId: req.user._id });
    
    const result = await syncForShop(shop, req.user._id, mode);
    res.json({ success: true, ...result });
  } catch (error) {
    handleShopifyError(error, res);
  }
});

// Webhook handling
const handleShopifyWebhook = async (req, res) => {
  const hmacHeader = req.get('x-shopify-hmac-sha256');
  const topic = req.get('x-shopify-topic');
  const shopDomain = (req.get('x-shopify-shop-domain') || '').toLowerCase();
  const rawBody = req.body.toString('utf8');

  try {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET;
    if (!verifyShopifyWebhook(rawBody, hmacHeader, secret)) return res.status(401).send('Invalid signature');

    const payload = JSON.parse(rawBody);
    // Find store to get merchantId
    const store = await ShopifyStore.findOne({ shop: shopDomain, isActive: true });
    if (!store) return res.status(200).send('Store not found or inactive');

    if (topic.startsWith('orders/')) {
       // logic for saving order...
    }
    
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
};

router.post('/webhooks/orders-create', handleShopifyWebhook);
router.post('/webhooks/orders-paid', handleShopifyWebhook);
router.post('/webhooks/orders-updated', handleShopifyWebhook);

// @route   POST /api/shopify/webhooks/app-uninstalled
// @desc    Handle app/uninstalled webhook from Shopify
const handleAppUninstalled = async (req, res) => {
  const hmacHeader = req.get('x-shopify-hmac-sha256');
  const shopDomain = (req.get('x-shopify-shop-domain') || '').toLowerCase();
  
  // RAW BODY is in req.body because of express.raw middleware in server.js
  const rawBody = req.body; 

  try {
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET;
    
    // Pass Buffer directly if verifyShopifyWebhook supports it, otherwise rawBody.toString('utf8')
    const verifyBody = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;

    if (!verifyShopifyWebhook(verifyBody, hmacHeader, secret)) {
      console.log('[Uninstall Webhook] HMAC verification failed for:', shopDomain);
      return res.status(401).send('Invalid signature');
    }

    const sanitizedShop = sanitizeShop(shopDomain);
    if (!sanitizedShop) {
      console.log('[Uninstall Webhook] Invalid shop domain:', shopDomain);
      return res.status(200).send('OK');
    }

    await ShopifyStore.findOneAndUpdate(
      { shop: sanitizedShop },
      {
        $set: {
          isActive: false,
          accessToken: null,
          uninstalledAt: new Date()
        }
      }
    );

    console.log('[Shopify Webhook] topic: app/uninstalled, shop:', shopDomain, 'UNINSTALL PROCESSED');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[Uninstall Webhook Error]', err);
    // Shopify expects 200 to acknowledge receipt even if processing fails internally, 
    // but a 5xx will trigger retries. Requirement says "Return 200 always".
    return res.status(200).json({ ok: false, error: err.message });
  }
};

router.post('/webhooks/app-uninstalled', handleAppUninstalled);

module.exports = router;
