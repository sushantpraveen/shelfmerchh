import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, ThumbsUp, ImageIcon } from 'lucide-react';
import StarRating from './StarRating';
import { Button } from '@/components/ui/button';

interface ReviewImage {
    url: string;
    caption?: string;
}

interface ReviewCardProps {
    id: string;
    customerName: string;
    rating: number;
    title?: string;
    body: string;
    images: ReviewImage[];
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    createdAt: string;
    onMarkHelpful?: (reviewId: string) => void;
    hasVotedHelpful?: boolean;
}

/**
 * ReviewCard Component
 * Displays a single customer review with rating, images, and helpful button
 */
const ReviewCard: React.FC<ReviewCardProps> = ({
    id,
    customerName,
    rating,
    title,
    body,
    images,
    isVerifiedPurchase,
    helpfulCount,
    createdAt,
    onMarkHelpful,
    hasVotedHelpful = false,
}) => {
    const [showAllImages, setShowAllImages] = React.useState(false);
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

    const displayedImages = showAllImages ? images : images.slice(0, 3);
    const hasMoreImages = images.length > 3 && !showAllImages;

    const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    return (
        <div className="border-b border-border py-6 last:border-b-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{customerName}</span>
                        {isVerifiedPurchase && (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified Purchase
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <StarRating value={rating} size="sm" readonly />
                        <span className="text-xs text-muted-foreground">{formattedDate}</span>
                    </div>
                </div>
            </div>

            {/* Title */}
            {title && <h4 className="font-semibold text-foreground mb-2">{title}</h4>}

            {/* Body */}
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">{body}</p>

            {/* Images */}
            {images.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                        {displayedImages.map((img, idx) => (
                            <button
                                key={idx}
                                className="relative w-20 h-20 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary transition-all"
                                onClick={() => setSelectedImage(img.url)}
                            >
                                <img
                                    src={img.url}
                                    alt={img.caption || `Review image ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                        {hasMoreImages && (
                            <button
                                className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center text-sm text-muted-foreground hover:bg-muted/80 transition-colors"
                                onClick={() => setShowAllImages(true)}
                            >
                                +{images.length - 3}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Helpful */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        'text-muted-foreground hover:text-foreground',
                        hasVotedHelpful && 'text-primary'
                    )}
                    onClick={() => onMarkHelpful?.(id)}
                    disabled={hasVotedHelpful}
                >
                    <ThumbsUp className={cn('h-4 w-4 mr-1', hasVotedHelpful && 'fill-current')} />
                    Helpful ({helpfulCount})
                </Button>
            </div>

            {/* Image Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <img
                        src={selectedImage}
                        alt="Review image"
                        className="max-w-full max-h-full object-contain rounded-lg"
                    />
                </div>
            )}
        </div>
    );
};

export default ReviewCard;
