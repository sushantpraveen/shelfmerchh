import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, MessageSquare, ChevronDown } from 'lucide-react';
import StarRating from './StarRating';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';
import useProductReviews from './useProductReviews';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ReviewsSectionProps {
    productId: string;
    heading?: string;
    showForm?: boolean;
    maxInitialReviews?: number;
    className?: string;
}

/**
 * ReviewsSection Component
 * Complete reviews section with stats, list, pagination, and submission form
 */
const ReviewsSection: React.FC<ReviewsSectionProps> = ({
    productId,
    heading = 'Customer Reviews',
    showForm = true,
    maxInitialReviews = 5,
    className,
}) => {
    const { reviews, stats, isLoading, error, hasMore, loadMore, refresh, sortBy, setSortBy } =
        useProductReviews(productId, maxInitialReviews);

    const [showReviewForm, setShowReviewForm] = useState(false);
    const [helpfulVotes, setHelpfulVotes] = useState<Set<string>>(new Set());

    const handleMarkHelpful = async (reviewId: string) => {
        if (helpfulVotes.has(reviewId)) return;

        // Generate session-based voter ID
        let voterId = localStorage.getItem('review_voter_id');
        if (!voterId) {
            voterId = `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            localStorage.setItem('review_voter_id', voterId);
        }

        try {
            const { reviewsApi } = await import('@/lib/api');
            await reviewsApi.markHelpful(reviewId, voterId);
            setHelpfulVotes((prev) => new Set(prev).add(reviewId));
            refresh();
        } catch (error) {
            console.error('Failed to mark helpful:', error);
        }
    };

    const handleFormSuccess = () => {
        setShowReviewForm(false);
        refresh();
    };

    // Rating distribution bar
    const RatingBar = ({ rating, count }: { rating: number; count: number }) => {
        const percentage = stats?.totalCount ? (count / stats.totalCount) * 100 : 0;
        return (
            <div className="flex items-center gap-2 text-sm">
                <span className="w-3">{rating}</span>
                <StarRating value={1} size="sm" readonly />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <span className="w-8 text-muted-foreground text-right">{count}</span>
            </div>
        );
    };

    if (error) {
        return (
            <div className={cn('py-12 text-center', className)}>
                <p className="text-muted-foreground">Failed to load reviews</p>
                <Button variant="outline" size="sm" onClick={refresh} className="mt-2">
                    Try Again
                </Button>
            </div>
        );
    }

    return (
        <section className={cn('py-8 md:py-12', className)}>
            <div className="max-w-6xl mx-auto px-4 md:px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold">{heading}</h2>
                        {stats && stats.totalCount > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                                <StarRating value={stats.averageRating} size="md" readonly showValue />
                                <span className="text-muted-foreground">
                                    Based on {stats.totalCount} review{stats.totalCount !== 1 ? 's' : ''}
                                </span>
                            </div>
                        )}
                    </div>
                    {showForm && !showReviewForm && (
                        <Button onClick={() => setShowReviewForm(true)}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Write a Review
                        </Button>
                    )}
                </div>

                {/* Review Form */}
                {showReviewForm && (
                    <Card className="p-6 mb-8">
                        <h3 className="text-lg font-semibold mb-4">Write Your Review</h3>
                        <ReviewForm
                            productId={productId}
                            onSuccess={handleFormSuccess}
                            onCancel={() => setShowReviewForm(false)}
                        />
                    </Card>
                )}

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Stats Sidebar */}
                    {stats && stats.totalCount > 0 && (
                        <div className="lg:col-span-1">
                            <Card className="p-6 sticky top-4">
                                <div className="text-center mb-6">
                                    <div className="text-5xl font-bold">{stats.averageRating.toFixed(1)}</div>
                                    <StarRating
                                        value={stats.averageRating}
                                        size="lg"
                                        readonly
                                        className="justify-center mt-2"
                                    />
                                    <p className="text-muted-foreground mt-2">
                                        {stats.totalCount} review{stats.totalCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    {[5, 4, 3, 2, 1].map((rating) => (
                                        <RatingBar
                                            key={rating}
                                            rating={rating}
                                            count={stats.distribution[rating as keyof typeof stats.distribution]}
                                        />
                                    ))}
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Reviews List */}
                    <div className={cn(stats && stats.totalCount > 0 ? 'lg:col-span-3' : 'lg:col-span-4')}>
                        {/* Sort */}
                        {reviews.length > 0 && (
                            <div className="flex justify-end mb-4">
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent">Most Recent</SelectItem>
                                        <SelectItem value="helpful">Most Helpful</SelectItem>
                                        <SelectItem value="highest">Highest Rating</SelectItem>
                                        <SelectItem value="lowest">Lowest Rating</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* Loading */}
                        {isLoading && reviews.length === 0 && (
                            <div className="py-12 text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                                <p className="text-muted-foreground mt-2">Loading reviews...</p>
                            </div>
                        )}

                        {/* Empty State */}
                        {!isLoading && reviews.length === 0 && (
                            <Card className="py-12 text-center border-dashed">
                                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                                <h3 className="text-lg font-medium">No reviews yet</h3>
                                <p className="text-muted-foreground mb-4">
                                    Be the first to share your experience with this product!
                                </p>
                                {showForm && !showReviewForm && (
                                    <Button onClick={() => setShowReviewForm(true)}>Write a Review</Button>
                                )}
                            </Card>
                        )}

                        {/* Reviews */}
                        {reviews.length > 0 && (
                            <div>
                                {reviews.map((review) => (
                                    <ReviewCard
                                        key={review.id}
                                        {...review}
                                        onMarkHelpful={handleMarkHelpful}
                                        hasVotedHelpful={helpfulVotes.has(review.id)}
                                    />
                                ))}

                                {/* Load More */}
                                {hasMore && (
                                    <div className="text-center mt-6">
                                        <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                                            {isLoading ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 mr-2" />
                                            )}
                                            Load More Reviews
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ReviewsSection;
