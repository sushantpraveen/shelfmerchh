const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

/**
 * @route   GET /api/admin/shopify-orders
 * @desc    List all Shopify-synced orders for Superadmins
 * @access  Private (Superadmin)
 */
router.get('/', protect, authorize('superadmin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const q = req.query.q || '';
    const shop = req.query.shop;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};
    if (shop) filter.shop = shop.toLowerCase();

    if (q) {
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { shopifyOrderId: searchRegex },
        { orderName: searchRegex },
        { email: searchRegex },
        { customerName: searchRegex },
        { 'customer.email': searchRegex },
        { 'customer.phone': searchRegex }
      ];
    }

    const total = await Order.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const orders = await Order.find(filter)
      .sort({ createdAtShopify: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      data: orders,
      page,
      limit,
      total,
      totalPages
    });
  } catch (error) {
    console.error('[AdminShopifyOrders] Error listing orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to list Shopify orders' });
  }
});

/**
 * @route   GET /api/admin/shopify-orders/:shopifyOrderId
 * @desc    Get single Shopify order detail
 * @access  Private (Superadmin)
 */
router.get('/:shopifyOrderId', protect, authorize('superadmin'), async (req, res) => {
  try {
    const { shopifyOrderId } = req.params;
    const order = await Order.findOne({ shopifyOrderId }).lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('[AdminShopifyOrders] Error fetching order detail:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details' });
  }
});

/**
 * @route   GET /api/admin/shopify-orders/debug/orders/count
 * @desc    Debug helper to see order stats
 * @access  Private (Superadmin)
 */
router.get('/debug/orders/count', protect, authorize('superadmin'), async (req, res) => {
  try {
    const total = await Order.countDocuments({});
    const latest = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .select('shopifyOrderId orderName createdAt')
      .lean();

    return res.json({
      success: true,
      total,
      latest
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
