import { useState, useEffect, useCallback } from 'react';
import { reviewsApi } from '@/lib/api';

interface ReviewImage {
    url: string;
    caption?: string;
}

interface Review {
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

interface ReviewStats {
    averageRating: number;
    totalCount: number;
    distribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

interface UseProductReviewsResult {
    reviews: Review[];
    stats: ReviewStats | null;
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    loadMore: () => Promise<void>;
    refresh: () => Promise<void>;
    sortBy: string;
    setSortBy: (sort: string) => void;
}

/**
 * useProductReviews Hook
 * Fetches and manages product reviews with pagination and sorting
 */
export function useProductReviews(productId: string, initialLimit = 5): UseProductReviewsResult {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [stats, setStats] = useState<ReviewStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [skip, setSkip] = useState(0);
    const [sortBy, setSortBy] = useState('recent');

    const fetchReviews = useCallback(async (reset = false) => {
        if (!productId) return;

        try {
            setIsLoading(true);
            setError(null);

            const currentSkip = reset ? 0 : skip;
            const response = await reviewsApi.getReviews(productId, {
                limit: initialLimit,
                skip: currentSkip,
                sort: sortBy,
            });

            if (response.success && response.data) {
                const { reviews: newReviews, stats: newStats, pagination } = response.data;

                if (reset) {
                    setReviews(newReviews);
                } else {
                    setReviews((prev) => [...prev, ...newReviews]);
                }

                setStats(newStats);
                setHasMore(pagination.hasMore);
                setSkip(currentSkip + newReviews.length);
            }
        } catch (err) {
            console.error('[useProductReviews] Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load reviews');
        } finally {
            setIsLoading(false);
        }
    }, [productId, initialLimit, sortBy, skip]);

    // Initial fetch
    useEffect(() => {
        setReviews([]);
        setSkip(0);
        fetchReviews(true);
    }, [productId, sortBy]);

    const loadMore = async () => {
        if (isLoading || !hasMore) return;
        await fetchReviews(false);
    };

    const refresh = async () => {
        setReviews([]);
        setSkip(0);
        await fetchReviews(true);
    };

    return {
        reviews,
        stats,
        isLoading,
        error,
        hasMore,
        loadMore,
        refresh,
        sortBy,
        setSortBy,
    };
}

export default useProductReviews;
