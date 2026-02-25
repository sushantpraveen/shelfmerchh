const ShopifyStore = require('../models/ShopifyStore');

/**
 * Middleware: Verify that the shop (from query or params) belongs to the logged-in merchant.
 * Requires req.user to be set by auth middleware (protect).
 * Attaches req.shopifyStore to the request if found.
 */
const requireStoreOwnership = async (req, res, next) => {
  try {
    const shop = req.query.shop || req.params.shop;
    if (!shop) {
      return res.status(400).json({ success: false, message: 'Missing shop parameter' });
    }

    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const store = await ShopifyStore.findOne({ shop, merchantId: req.user._id });
    if (!store) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this store'
      });
    }

    req.shopifyStore = store;
    next();
  } catch (error) {
    console.error('[requireStoreOwnership] Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error checking store ownership' });
  }
};

module.exports = { requireStoreOwnership };
