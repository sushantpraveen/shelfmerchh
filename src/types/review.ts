/**
 * Review Types
 * TypeScript types for product reviews
 */

/**
 * Review image
 */
export interface ReviewImage {
    url: string;
    caption?: string;
}

/**
 * Single review
 */
export interface Review {
    id: string;
    customerName: string;
    rating: number;
    title?: string;
    body: string;
    images: ReviewImage[];
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: string;
}

/**
 * Rating distribution
 */
export interface RatingDistribution {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
}

/**
 * Review statistics
 */
export interface ReviewStats {
    averageRating: number;
    totalCount: number;
    distribution: RatingDistribution;
}

/**
 * Paginated reviews response
 */
export interface ReviewsResponse {
    reviews: Review[];
    stats: ReviewStats;
    pagination: {
        total: number;
        limit: number;
        skip: number;
        hasMore: boolean;
    };
}

/**
 * Create review payload
 */
export interface CreateReviewPayload {
    customerName: string;
    customerEmail?: string;
    rating: number;
    title?: string;
    body: string;
    images?: ReviewImage[];
}

/**
 * Sort options for reviews
 */
export type ReviewSortOption = 'recent' | 'helpful' | 'highest' | 'lowest';
