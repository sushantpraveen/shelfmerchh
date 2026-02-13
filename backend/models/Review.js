const mongoose = require('mongoose');

/**
 * Review Model
 * Stores customer reviews for store products with ratings, images, and verified purchase status.
 * Reviews are auto-approved by default (no moderation required).
 */
const ReviewSchema = new mongoose.Schema(
    {
        // Product being reviewed (StoreProduct, not CatalogProduct)
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StoreProduct',
            required: true,
            index: true,
        },
        // Store this review belongs to
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true,
        },
        // Customer who left the review (optional for guest reviews)
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StoreCustomer',
        },
        // Customer info (for display, required)
        customerName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        customerEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        // Rating (1-5 stars)
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            validate: {
                validator: Number.isInteger,
                message: 'Rating must be an integer between 1 and 5',
            },
        },
        // Review title (optional)
        title: {
            type: String,
            trim: true,
            maxlength: 200,
        },
        // Review body (required)
        body: {
            type: String,
            required: true,
            trim: true,
            minlength: 10,
            maxlength: 5000,
        },
        // Review images (uploaded by customer)
        images: [
            {
                url: {
                    type: String,
                    required: true,
                },
                caption: {
                    type: String,
                    trim: true,
                    maxlength: 200,
                },
            },
        ],
        // Whether this is from a verified purchaser
        isVerifiedPurchase: {
            type: Boolean,
            default: false,
        },
        // Order reference (if verified purchase)
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StoreOrder',
        },
        // Moderation status (auto-approved by default)
        isApproved: {
            type: Boolean,
            default: true,
        },
        // Helpful votes
        helpfulCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Users who marked this as helpful
        helpfulVoters: [
            {
                type: String, // Can be customerId or sessionId
            },
        ],
        // Admin notes (for moderation)
        adminNotes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for product reviews
ReviewSchema.index({ productId: 1, createdAt: -1 });

// Compound index for store reviews
ReviewSchema.index({ storeId: 1, createdAt: -1 });

// Index for finding verified purchases
ReviewSchema.index({ productId: 1, isVerifiedPurchase: 1 });

// Prevent duplicate reviews from same customer on same product
ReviewSchema.index({ productId: 1, customerEmail: 1 }, { unique: true, sparse: true });

/**
 * Get review statistics for a product
 * @param {ObjectId} productId - Product ID
 * @returns {Promise<{averageRating: number, totalCount: number, distribution: object}>}
 */
ReviewSchema.statics.getProductStats = async function (productId) {
    const result = await this.aggregate([
        {
            $match: {
                productId: new mongoose.Types.ObjectId(productId),
                isApproved: true,
            },
        },
        {
            $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalCount: { $sum: 1 },
                rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
                rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
                rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
                rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
                rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            },
        },
    ]);

    if (result.length === 0) {
        return {
            averageRating: 0,
            totalCount: 0,
            distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        };
    }

    const stats = result[0];
    return {
        averageRating: Math.round(stats.averageRating * 10) / 10, // Round to 1 decimal
        totalCount: stats.totalCount,
        distribution: {
            5: stats.rating5,
            4: stats.rating4,
            3: stats.rating3,
            2: stats.rating2,
            1: stats.rating1,
        },
    };
};

/**
 * Check if a customer has already reviewed a product
 * @param {ObjectId} productId - Product ID
 * @param {string} customerEmail - Customer email
 * @returns {Promise<boolean>}
 */
ReviewSchema.statics.hasCustomerReviewed = async function (productId, customerEmail) {
    if (!customerEmail) return false;
    const count = await this.countDocuments({
        productId,
        customerEmail: customerEmail.toLowerCase(),
    });
    return count > 0;
};

/**
 * Mark a review as helpful
 * @param {ObjectId} reviewId - Review ID
 * @param {string} voterId - Voter ID (customerId or sessionId)
 * @returns {Promise<Review>}
 */
ReviewSchema.statics.markHelpful = async function (reviewId, voterId) {
    const review = await this.findById(reviewId);
    if (!review) {
        throw new Error('Review not found');
    }

    // Check if already voted
    if (review.helpfulVoters.includes(voterId)) {
        throw new Error('Already marked as helpful');
    }

    review.helpfulVoters.push(voterId);
    review.helpfulCount = review.helpfulVoters.length;
    await review.save();

    return review;
};

module.exports = mongoose.model('Review', ReviewSchema);
