import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import StarRating from './StarRating';
import { reviewsApi } from '@/lib/api';
import { uploadApi } from '@/lib/api';

interface ReviewFormProps {
    productId: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

interface ImageUpload {
    url: string;
    caption?: string;
    isUploading?: boolean;
}

/**
 * ReviewForm Component
 * Form for submitting a new product review with rating, text, and images
 */
const ReviewForm: React.FC<ReviewFormProps> = ({ productId, onSuccess, onCancel }) => {
    const [rating, setRating] = useState(0);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [images, setImages] = useState<ImageUpload[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (rating === 0) {
            newErrors.rating = 'Please select a rating';
        }
        if (!customerName.trim()) {
            newErrors.customerName = 'Name is required';
        }
        if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
            newErrors.customerEmail = 'Invalid email format';
        }
        if (!body.trim() || body.trim().length < 10) {
            newErrors.body = 'Review must be at least 10 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const maxImages = 5 - images.length;
        const filesToUpload = Array.from(files).slice(0, maxImages);

        for (const file of filesToUpload) {
            // Add placeholder
            const tempId = Date.now() + Math.random();
            setImages((prev) => [...prev, { url: '', isUploading: true } as ImageUpload]);

            try {
                const url = await uploadApi.uploadImage(file, 'reviews');
                setImages((prev) =>
                    prev.map((img) =>
                        img.url === '' && img.isUploading ? { url, isUploading: false } : img
                    )
                );
            } catch (error) {
                toast.error('Failed to upload image');
                setImages((prev) => prev.filter((img) => !(img.url === '' && img.isUploading)));
            }
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSubmitting(true);
        try {
            await reviewsApi.create(productId, {
                customerName: customerName.trim(),
                customerEmail: customerEmail.trim() || undefined,
                rating,
                title: title.trim() || undefined,
                body: body.trim(),
                images: images.filter((img) => img.url && !img.isUploading),
            });

            toast.success('Thank you for your review!');
            onSuccess?.();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to submit review';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div className="space-y-2">
                <Label className="text-base">Your Rating *</Label>
                <div className="flex items-center gap-2">
                    <StarRating value={rating} onChange={setRating} size="lg" />
                    {rating > 0 && (
                        <span className="text-sm text-muted-foreground">
                            {rating === 5
                                ? 'Excellent!'
                                : rating === 4
                                    ? 'Great'
                                    : rating === 3
                                        ? 'Good'
                                        : rating === 2
                                            ? 'Fair'
                                            : 'Poor'}
                        </span>
                    )}
                </div>
                {errors.rating && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.rating}
                    </p>
                )}
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="customerName">Name *</Label>
                    <Input
                        id="customerName"
                        placeholder="Your name"
                        value={customerName}
                        onChange={(e) => {
                            setCustomerName(e.target.value);
                            if (errors.customerName) setErrors({ ...errors, customerName: '' });
                        }}
                        className={errors.customerName ? 'border-destructive' : ''}
                    />
                    {errors.customerName && (
                        <p className="text-xs text-destructive">{errors.customerName}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customerEmail">Email (optional)</Label>
                    <Input
                        id="customerEmail"
                        type="email"
                        placeholder="For verified purchase badge"
                        value={customerEmail}
                        onChange={(e) => {
                            setCustomerEmail(e.target.value);
                            if (errors.customerEmail) setErrors({ ...errors, customerEmail: '' });
                        }}
                        className={errors.customerEmail ? 'border-destructive' : ''}
                    />
                    {errors.customerEmail && (
                        <p className="text-xs text-destructive">{errors.customerEmail}</p>
                    )}
                </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
                <Label htmlFor="title">Review Title (optional)</Label>
                <Input
                    id="title"
                    placeholder="Summarize your review"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            {/* Body */}
            <div className="space-y-2">
                <Label htmlFor="body">Your Review *</Label>
                <Textarea
                    id="body"
                    placeholder="Tell us about your experience with this product..."
                    rows={4}
                    value={body}
                    onChange={(e) => {
                        setBody(e.target.value);
                        if (errors.body) setErrors({ ...errors, body: '' });
                    }}
                    className={errors.body ? 'border-destructive' : ''}
                />
                {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
                <p className="text-xs text-muted-foreground">{body.length}/5000 characters</p>
            </div>

            {/* Images */}
            <div className="space-y-2">
                <Label>Add Photos (optional)</Label>
                <div className="flex flex-wrap gap-2">
                    {images.map((img, idx) => (
                        <div
                            key={idx}
                            className="relative w-20 h-20 rounded-lg overflow-hidden border border-border"
                        >
                            {img.isUploading ? (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    <img
                                        src={img.url}
                                        alt={`Upload ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                                        onClick={() => removeImage(idx)}
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                    {images.length < 5 && (
                        <button
                            type="button"
                            className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-5 w-5" />
                            <span className="text-xs mt-1">Upload</span>
                        </button>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                />
                <p className="text-xs text-muted-foreground">Up to 5 images</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        'Submit Review'
                    )}
                </Button>
            </div>
        </form>
    );
};

export default ReviewForm;
