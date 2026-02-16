import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2, XCircle, Banknote, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { adminWithdrawalsApi } from '@/lib/api';

interface WithdrawalRequest {
    id: string;
    merchantName?: string;
    merchantEmail?: string;
    amountRupees: string;
    upiId: string;
}

// ============================================
// Approve Dialog
// ============================================
interface ApproveDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    withdrawal: WithdrawalRequest | null;
    onSuccess: () => void;
}

export const ApproveWithdrawalDialog: React.FC<ApproveDialogProps> = ({
    open,
    onOpenChange,
    withdrawal,
    onSuccess,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleApprove = async () => {
        if (!withdrawal) return;

        setIsSubmitting(true);
        try {
            await adminWithdrawalsApi.approve(withdrawal.id);
            toast.success('Withdrawal approved! Balance has been deducted.');
            onOpenChange(false);
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to approve withdrawal';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!withdrawal) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        Approve Withdrawal
                    </DialogTitle>
                    <DialogDescription>
                        This will deduct the amount from the merchant's wallet.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3">
                    <div className="rounded-lg bg-green-500/10 p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">₹{withdrawal.amountRupees}</p>
                    </div>
                    <div className="text-sm space-y-1">
                        <p>
                            <span className="text-muted-foreground">Merchant:</span>{' '}
                            {withdrawal.merchantName || withdrawal.merchantEmail}
                        </p>
                        <p>
                            <span className="text-muted-foreground">UPI ID:</span>{' '}
                            <span className="font-mono">{withdrawal.upiId}</span>
                        </p>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 text-yellow-700 text-sm">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>After approval, you need to manually send the UPI payment and mark it as paid.</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleApprove} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Approve Withdrawal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ============================================
// Reject Dialog
// ============================================
interface RejectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    withdrawal: WithdrawalRequest | null;
    onSuccess: () => void;
}

export const RejectWithdrawalDialog: React.FC<RejectDialogProps> = ({
    open,
    onOpenChange,
    withdrawal,
    onSuccess,
}) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReject = async () => {
        if (!withdrawal) return;

        if (!reason.trim() || reason.trim().length < 3) {
            setError('Please provide a reason (minimum 3 characters)');
            return;
        }

        setIsSubmitting(true);
        try {
            await adminWithdrawalsApi.reject(withdrawal.id, reason.trim());
            toast.success('Withdrawal rejected');
            setReason('');
            setError(null);
            onOpenChange(false);
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to reject withdrawal';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setReason('');
            setError(null);
            onOpenChange(false);
        }
    };

    if (!withdrawal) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        Reject Withdrawal
                    </DialogTitle>
                    <DialogDescription>
                        Provide a reason for rejecting this withdrawal request.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="text-sm space-y-1">
                        <p>
                            <span className="text-muted-foreground">Amount:</span>{' '}
                            <span className="font-bold">₹{withdrawal.amountRupees}</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Merchant:</span>{' '}
                            {withdrawal.merchantName || withdrawal.merchantEmail}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="reason">Rejection Reason *</Label>
                        <Textarea
                            id="reason"
                            placeholder="e.g., Invalid UPI ID, Suspicious activity..."
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError(null);
                            }}
                            disabled={isSubmitting}
                            className={error ? 'border-destructive' : ''}
                        />
                        {error && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {error}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={isSubmitting || !reason.trim()}
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Reject Withdrawal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ============================================
// Mark Paid Dialog
// ============================================
interface MarkPaidDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    withdrawal: WithdrawalRequest | null;
    onSuccess: () => void;
}

export const MarkPaidDialog: React.FC<MarkPaidDialogProps> = ({
    open,
    onOpenChange,
    withdrawal,
    onSuccess,
}) => {
    const [payoutReference, setPayoutReference] = useState('');
    const [notes, setNotes] = useState('');
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('File size must be less than 5MB');
                return;
            }
            setScreenshot(file);
            setError(null);
        }
    };

    const handleMarkPaid = async () => {
        if (!withdrawal) return;

        setIsSubmitting(true);
        try {
            await adminWithdrawalsApi.markPaid(withdrawal.id, {
                payoutReference: payoutReference.trim() || undefined,
                notes: notes.trim() || undefined,
                screenshot: screenshot || undefined,
            });
            toast.success('Withdrawal marked as paid');
            handleClose();
            onSuccess();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to mark as paid';
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setPayoutReference('');
            setNotes('');
            setScreenshot(null);
            setError(null);
            onOpenChange(false);
        }
    };

    if (!withdrawal) return null;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-green-600" />
                        Mark as Paid
                    </DialogTitle>
                    <DialogDescription>
                        Upload payment proof or enter transaction reference.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                        <p>
                            <span className="text-muted-foreground">Amount:</span>{' '}
                            <span className="font-bold text-green-600">₹{withdrawal.amountRupees}</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">UPI ID:</span>{' '}
                            <span className="font-mono">{withdrawal.upiId}</span>
                        </p>
                        <p>
                            <span className="text-muted-foreground">Merchant:</span>{' '}
                            {withdrawal.merchantName || withdrawal.merchantEmail}
                        </p>
                    </div>

                    {/* Screenshot Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="screenshot">Payment Screenshot (Recommended)</Label>
                        <div className="flex items-center gap-4">
                            <Input
                                id="screenshot"
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={isSubmitting}
                                className="cursor-pointer"
                            />
                        </div>
                        {screenshot && (
                            <div className="mt-2 flex items-center justify-between p-2 rounded-md border bg-muted/50">
                                <span className="text-sm truncate max-w-[200px] flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <span className="truncate">{screenshot.name}</span>
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive shrink-0"
                                    onClick={() => setScreenshot(null)}
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="utr">UTR / Transaction Reference</Label>
                        <Input
                            id="utr"
                            placeholder="e.g., 123456789012"
                            value={payoutReference}
                            onChange={(e) => {
                                setPayoutReference(e.target.value);
                                if (error) setError(null);
                            }}
                            disabled={isSubmitting}
                            className={error ? 'border-destructive' : ''}
                        />
                        {error && (
                            <p className="text-xs text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Any additional notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            disabled={isSubmitting}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleMarkPaid}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Mark as Paid
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
