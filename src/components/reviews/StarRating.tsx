import React from 'react';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface StarRatingProps {
    value: number;
    onChange?: (value: number) => void;
    size?: 'sm' | 'md' | 'lg';
    readonly?: boolean;
    showValue?: boolean;
    className?: string;
}

const sizeMap = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
};

/**
 * StarRating Component
 * Displays star rating (readonly) or allows rating input (interactive)
 */
const StarRating: React.FC<StarRatingProps> = ({
    value,
    onChange,
    size = 'md',
    readonly = false,
    showValue = false,
    className,
}) => {
    const [hoverValue, setHoverValue] = React.useState(0);

    const handleClick = (rating: number) => {
        if (!readonly && onChange) {
            onChange(rating);
        }
    };

    const handleMouseEnter = (rating: number) => {
        if (!readonly) {
            setHoverValue(rating);
        }
    };

    const handleMouseLeave = () => {
        setHoverValue(0);
    };

    const displayValue = hoverValue || value;

    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {[1, 2, 3, 4, 5].map((rating) => {
                const isFilled = rating <= displayValue;
                const isHalf = !isFilled && rating - 0.5 <= displayValue;

                return (
                    <button
                        key={rating}
                        type="button"
                        className={cn(
                            'relative transition-transform',
                            !readonly && 'cursor-pointer hover:scale-110',
                            readonly && 'cursor-default'
                        )}
                        onClick={() => handleClick(rating)}
                        onMouseEnter={() => handleMouseEnter(rating)}
                        onMouseLeave={handleMouseLeave}
                        disabled={readonly}
                        aria-label={`Rate ${rating} stars`}
                    >
                        <Star
                            className={cn(
                                sizeMap[size],
                                'transition-colors',
                                isFilled
                                    ? 'fill-amber-400 text-amber-400'
                                    : isHalf
                                        ? 'fill-amber-400/50 text-amber-400'
                                        : 'fill-transparent text-gray-300'
                            )}
                        />
                    </button>
                );
            })}
            {showValue && (
                <span className="ml-1.5 text-sm font-medium text-muted-foreground">
                    {value.toFixed(1)}
                </span>
            )}
        </div>
    );
};

export default StarRating;
