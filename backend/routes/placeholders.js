const express = require('express');
const router = express.Router();
const Placeholder = require('../models/Placeholder');

// @route   GET /api/placeholders
// @desc    Get placeholders by productId and view
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { productId, view } = req.query;
        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId is required' });
        }

        const query = { productId };
        if (view) query.view = view;

        const placeholders = await Placeholder.find(query).sort({ createdAt: 1 });

        res.json({
            success: true,
            data: placeholders
        });
    } catch (error) {
        console.error('Error fetching placeholders:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
