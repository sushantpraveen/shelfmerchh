const express = require('express');
const router = express.Router();
const StoreOrder = require('../models/StoreOrder');
const { protect } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Reuse verifyStoreToken logic from storeAuth without circular requires
const verifyStoreToken = (req, res, next) => {
  const header = req.header('Authorization') || '';
  const token = header.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, message: 'No auth token found' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.customer = decoded; // { customer: { id, storeId } }
    next();
  } catch (err) {
    console.error('Customer token verification failed', err);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// GET /api/store-customer/orders
// List orders for the authenticated store customer for the current store
router.get('/', verifyStoreToken, async (req, res) => {
  try {
    const customerInfo = req.customer && req.customer.customer;
    if (!customerInfo) {
      return res.status(401).json({ success: false, message: 'Not authenticated as store customer' });
    }

    const { id: customerId, storeId } = customerInfo;

    const orders = await StoreOrder.find({
      storeId,
      customerId,
    })
      .sort({ createdAt: -1 })
      .populate('items.storeProductId')
      .lean();

    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error listing customer store orders:', error);
    return res.status(500).json({ success: false, message: 'Failed to list orders' });
  }
});

// GET /api/store-customer/orders/:orderId
// Get details for a specific order
router.get('/:orderId', verifyStoreToken, async (req, res) => {
  try {
    const customerInfo = req.customer && req.customer.customer;
    if (!customerInfo) {
      return res.status(401).json({ success: false, message: 'Not authenticated as store customer' });
    }

    const { id: customerId, storeId } = customerInfo;
    const { orderId } = req.params;

    const order = await StoreOrder.findOne({
      _id: orderId,
      storeId,
      customerId,
    })
      .populate('items.storeProductId')
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error getting customer store order:', error);
    return res.status(500).json({ success: false, message: 'Failed to get order details' });
  }
});

module.exports = router;
