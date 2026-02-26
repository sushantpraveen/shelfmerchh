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

const jwt = require('jsonwebtoken');

// @route   GET /api/shopify/start
// @desc    Step 1: Reliable top-level navigation to start OAuth (Solves 3rd party cookie blocking)
router.get('/start', async (req, res) => {
  try {
    const { shop, token } = req.query;
    const sanitizedShop = sanitizeShop(shop);

    if (!sanitizedShop) {
      return res.status(400).send('Invalid or missing shop parameter');
    }

    if (!token) {
      return res.status(401).send('Authentication token missing. Please start flow from dashboard.');
    }

    // Verify merchant JWT token manually as this is a top-level navigation (no Bearer header)
    let merchantId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      merchantId = decoded.id || decoded._id;
    } catch (err) {
      return res.status(401).send('Invalid authentication token.');
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const publicBase = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
    const redirectUri = encodeURIComponent(`${publicBase}/api/shopify/callback`);

    // sushant added 
    console.log("SHOPIFY_API_KEY =", process.env.SHOPIFY_API_KEY);
console.log("SHOPIFY_SCOPES =", process.env.SHOPIFY_SCOPES);
console.log("PUBLIC_BASE_URL =", process.env.PUBLIC_BASE_URL);
    
    // FORCE standard OAuth flow: {shop}.myshopify.com/admin/oauth/authorize
    // Building strictly as per requirements to avoid unified admin landing issues
    const authorizeUrl = `https://${sanitizedShop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${encodeURIComponent(process.env.SHOPIFY_SCOPES)}&redirect_uri=${redirectUri}&state=${nonce}&shop=${sanitizedShop}`;

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      signed: true
    };

    // Set persistence cookies in a first-party context
    res.cookie('shopify_state', nonce, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('merchant_id', merchantId.toString(), { ...cookieOptions, maxAge: 60 * 60 * 1000 });

    // PROOF-LEVEL DEBUG LOG
    console.log('[Shopify OAuth] Redirecting to:', authorizeUrl);
    console.log('[Shopify START] SET-COOKIE', res.getHeader('Set-Cookie'));
    
    // Perform top-level redirect to Shopify
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
// @desc    Step 2: Handle Shopify OAuth callback
router.get('/callback', async (req, res) => {
  const { shop, code, state } = req.query;
  const sanitizedShop = sanitizeShop(shop);
  
  // Read state and merchant from signedCookies with fallback to plain cookies
  const cookieState = req.signedCookies.shopify_state || req.cookies.shopify_state;
  const merchantId = req.signedCookies.merchant_id || req.cookies.merchant_id;

  // FAIL-FAST WITH PROOF-LEVEL DEBUGGING
  if (!state || !cookieState || state !== cookieState || !merchantId) {
    console.log("[Shopify CALLBACK FAIL] COOKIE HEADER", req.headers.cookie);
    console.log("[Shopify CALLBACK FAIL] SIGNED KEYS", Object.keys(req.signedCookies || {}));
    console.log("[Shopify CALLBACK FAIL] PLAIN KEYS", Object.keys(req.cookies || {}));
    console.log("[Shopify CALLBACK FAIL] query.state", state, "cookieState", cookieState, "merchantId", merchantId);

    return res.status(403).send('Request origin could not be verified (Reason: Missing shopify_state cookie or timeout). Please try again from the dashboard.');
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

    // UPSERT STORE with merchantId (Isolation)
    await ShopifyStore.findOneAndUpdate(
      { shop: sanitizedShop, merchantId },
      { 
        accessToken: access_token, 
        scope: scope, 
        scopes: scope ? scope.split(',') : [],
        isActive: true, 
        installedAt: new Date() 
      },
      { upsert: true, new: true }
    );

    res.clearCookie('shopify_state', { path: '/', signed: true });
    
    // Redirect to Embedded App Page (Option A)
    const appBase = (process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');
    res.redirect(`${appBase}/shopify/app?shop=${sanitizedShop}`);

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
    
    // 1. Validate shop exists and is a .myshopify.com domain
    if (!shop || typeof shop !== 'string' || !shop.endsWith('.myshopify.com')) {
      return res.status(400).json({ 
        ok: false, 
        success: false, 
        message: 'Invalid shop domain. Must be a valid .myshopify.com domain.' 
      });
    }

    const sanitizedShop = sanitizeShop(shop);

    // 2. Lookup installed store (must have accessToken)
    // We search by shop name. 
    const store = await ShopifyStore.findOne({ shop: sanitizedShop });
    
    if (!store || !store.accessToken) {
      return res.status(400).json({ 
        ok: false, 
        success: false, 
        message: 'Store not installed yet. Please complete install from Shopify.' 
      });
    }

    // 3. Link the shop to the current merchant (Owner/User)
    // In our schema, we update the existing store record's merchantId
    store.merchantId = req.user._id;
    await store.save();

    console.log(`[Shopify Link] Linked shop ${sanitizedShop} to merchant ${req.user._id}`);
    res.json({ ok: true, success: true, shop: sanitizedShop, linked: true });
  } catch (error) {
    console.error('[Shopify Link Error]', error);
    res.status(500).json({ ok: false, success: false, message: error.message });
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

module.exports = router;
