const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const StoreProduct = require('../models/StoreProduct');
const StoreOrder = require('../models/StoreOrder');
const { protect, optionalAuth } = require('../middleware/auth');

/**
 * Review Routes
 * Public endpoints for fetching reviews, authenticated for submitting
 */

// @route   GET /api/reviews/:productId
// @desc    Get reviews for a product with pagination
// @access  Public
router.get('/:productId', async (req, res) => {
    try {
        const { productId } = req.params;
        const { limit = 10, skip = 0, sort = 'recent' } = req.query;

        // Validate product exists
        const product = await StoreProduct.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        // Build sort options
        let sortOptions = {};
        switch (sort) {
            case 'helpful':
                sortOptions = { helpfulCount: -1, createdAt: -1 };
                break;
            case 'highest':
                sortOptions = { rating: -1, createdAt: -1 };
                break;
            case 'lowest':
                sortOptions = { rating: 1, createdAt: -1 };
                break;
            case 'recent':
            default:
                sortOptions = { createdAt: -1 };
        }

        // Get reviews
        const [reviews, total, stats] = await Promise.all([
            Review.find({ productId, isApproved: true })
                .sort(sortOptions)
                .skip(parseInt(skip))
                .limit(parseInt(limit))
                .lean(),
            Review.countDocuments({ productId, isApproved: true }),
            Review.getProductStats(productId),
        ]);

        // Transform for frontend
        const formattedReviews = reviews.map((r) => ({
            id: r._id,
            customerName: r.customerName,
            rating: r.rating,
            title: r.title,
            body: r.body,
            images: r.images || [],
            isVerifiedPurchase: r.isVerifiedPurchase,
            helpfulCount: r.helpfulCount,
            createdAt: r.createdAt,
        }));

        res.json({
            success: true,
            data: {
                reviews: formattedReviews,
                stats,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    skip: parseInt(skip),
                    hasMore: parseInt(skip) + formattedReviews.length < total,
                },
            },
        });
    } catch (error) {
        console.error('[Reviews] Get reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
        });
    }
});

// @route   GET /api/reviews/:productId/stats
// @desc    Get review statistics only (lightweight endpoint)
// @access  Public
router.get('/:productId/stats', async (req, res) => {
    try {
        const { productId } = req.params;

        const stats = await Review.getProductStats(productId);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('[Reviews] Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch review stats',
        });
    }
});

// @route   POST /api/reviews/:productId
// @desc    Submit a new review
// @access  Public (with optional auth for verified purchase)
router.post('/:productId', optionalAuth, async (req, res) => {
    try {
        const { productId } = req.params;
        const { customerName, customerEmail, rating, title, body, images } = req.body;

        // Validate required fields
        if (!customerName || !rating || !body) {
            return res.status(400).json({
                success: false,
                message: 'Name, rating, and review body are required',
            });
        }

        // Validate rating
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be an integer between 1 and 5',
            });
        }

        // Validate body length
        if (body.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Review must be at least 10 characters',
            });
        }

        // Validate product exists
        const product = await StoreProduct.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        // Check for duplicate review
        if (customerEmail) {
            const hasReviewed = await Review.hasCustomerReviewed(productId, customerEmail);
            if (hasReviewed) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already reviewed this product',
                });
            }
        }

        // Check for verified purchase
        let isVerifiedPurchase = false;
        let orderId = null;

        if (customerEmail) {
            // Look for an order with this product from this customer
            const order = await StoreOrder.findOne({
                storeId: product.storeId,
                customerEmail: customerEmail.toLowerCase(),
                'items.storeProductId': productId,
                status: { $in: ['delivered', 'shipped'] },
            }).sort({ createdAt: -1 });

            if (order) {
                isVerifiedPurchase = true;
                orderId = order._id;
            }
        }

        // Validate images if provided
        const validatedImages = [];
        if (images && Array.isArray(images)) {
            for (const img of images.slice(0, 5)) { // Max 5 images
                if (img.url && typeof img.url === 'string') {
                    validatedImages.push({
                        url: img.url,
                        caption: img.caption?.slice(0, 200) || '',
                    });
                }
            }
        }

        // Create the review (auto-approved)
        const review = await Review.create({
            productId,
            storeId: product.storeId,
            customerName: customerName.trim(),
            customerEmail: customerEmail?.toLowerCase()?.trim(),
            rating,
            title: title?.trim(),
            body: body.trim(),
            images: validatedImages,
            isVerifiedPurchase,
            orderId,
            isApproved: true, // Auto-approve
        });

        console.log(`[Reviews] New review created for product ${productId}`);

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            data: {
                id: review._id,
                customerName: review.customerName,
                rating: review.rating,
                title: review.title,
                body: review.body,
                images: review.images,
                isVerifiedPurchase: review.isVerifiedPurchase,
                createdAt: review.createdAt,
            },
        });
    } catch (error) {
        console.error('[Reviews] Create review error:', error);

        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this product',
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Failed to submit review',
        });
    }
});

// @route   POST /api/reviews/:reviewId/helpful
// @desc    Mark a review as helpful
// @access  Public
router.post('/:reviewId/helpful', async (req, res) => {
    try {
        const { reviewId } = req.params;
        const { voterId } = req.body; // Session ID or customer ID

        if (!voterId) {
            return res.status(400).json({
                success: false,
                message: 'Voter ID is required',
            });
        }

        const review = await Review.markHelpful(reviewId, voterId);

        res.json({
            success: true,
            data: {
                helpfulCount: review.helpfulCount,
            },
        });
    } catch (error) {
        console.error('[Reviews] Mark helpful error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to mark as helpful',
        });
    }
});

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete a review (admin only)
// @access  Private/Admin
router.delete('/:reviewId', protect, async (req, res) => {
    try {
        // Only superadmin can delete reviews
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete reviews',
            });
        }

        const review = await Review.findByIdAndDelete(req.params.reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Review not found',
            });
        }

        console.log(`[Reviews] Admin ${req.user.email} deleted review ${req.params.reviewId}`);

        res.json({
            success: true,
            message: 'Review deleted',
        });
    } catch (error) {
        console.error('[Reviews] Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete review',
        });
    }
});

module.exports = router;
