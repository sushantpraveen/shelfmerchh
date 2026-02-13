import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import {
    CheckCircle2,
    Clock,
    ExternalLink,
    FileText,
    Wallet,
    History,
    Download
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { invoiceApi, walletApi } from '@/lib/api';
import DashboardLayout from '@/components/layout/DashboardLayout';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const MerchantInvoices = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [walletBalance, setWalletBalance] = useState<{ balancePaise: number; balanceRupees: string; currency: string } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);

            // Load invoices and wallet balance in parallel
            const [invoicesData, balanceResponse] = await Promise.all([
                invoiceApi.listForMerchant(),
                walletApi.getBalance()
            ]);

            setInvoices(invoicesData || []);
            // walletApi.getBalance returns the balance object directly
            if (balanceResponse && balanceResponse.balancePaise !== undefined) {
                setWalletBalance(balanceResponse);
            }
        } catch (err: any) {
            setError(err?.message || 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-500/10 text-green-500';
            case 'pending': return 'bg-yellow-500/10 text-yellow-500';
            case 'insufficient_funds': return 'bg-orange-500/10 text-orange-500';
            case 'cancelled': return 'bg-red-500/10 text-red-500';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'paid': return 'Paid';
            case 'pending': return 'Pending';
            case 'insufficient_funds': return 'Insufficient Funds';
            case 'cancelled': return 'Cancelled';
            default: return status;
        }
    };

    // Generate invoice PDF similar to admin invoices
    const handleDownloadPdf = async (invoice: any) => {
        if (!invoice) return;

        try {
            // Fetch full invoice details if not already loaded
            let fullInvoice = invoice;
            if (!invoice.items || !invoice.merchantId || !invoice.storeId) {
                try {
                    const invoiceData = await invoiceApi.getById(invoice._id);
                    fullInvoice = invoiceData;
                } catch (err) {
                    console.error('Failed to fetch invoice details:', err);
                    toast.error('Failed to load invoice details');
                    return;
                }
            }

            const doc = new jsPDF('p', 'pt', 'a4');

            const marginLeft = 40;
            let y = 40;

            const addLine = (text: string, options: { bold?: boolean; size?: number } = {}) => {
                const { bold = false, size = 10 } = options;
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setFontSize(size);
                doc.text(text, marginLeft, y);
                y += size + 4;
            };

            const addRight = (text: string, options: { bold?: boolean; size?: number } = {}) => {
                const { bold = false, size = 10 } = options;
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setFontSize(size);
                const pageWidth = doc.internal.pageSize.getWidth();
                const textWidth = doc.getTextWidth(text);
                doc.text(text, pageWidth - marginLeft - textWidth, y);
            };

            const formatCurrency = (v?: number) => `₹${Number(v || 0).toFixed(2)}`;

            const invoiceNumber = fullInvoice.invoiceNumber || 'INV-XXXX';
            const createdAt = fullInvoice.createdAt ? new Date(fullInvoice.createdAt) : new Date();
            const status = (fullInvoice.status || 'paid').toUpperCase();

            // New fields from backend
            const retailTotal = fullInvoice.customerPaidAmount || fullInvoice.orderId?.total || 0;
            const merchantProfit = fullInvoice.merchantProfit || (retailTotal > 0 ? retailTotal - fullInvoice.totalAmount : 0);

            // Header
            addLine('INVOICE', { bold: true, size: 18 });
            y += 4;
            addLine(`Invoice # ${invoiceNumber}`, { bold: true, size: 12 });
            addRight(
                createdAt.toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                }),
                { size: 10 },
            );
            y += 4;
            addLine(`Status ${status}`, { size: 10 });

            y += 16;

            // Platform address
            addLine('G2, Win-Win Towers, Siddhi Vinayak Nagar, Madhapur, Hyderabad, Telangana 500081', {
                size: 9,
            });
            addLine('Phone: 095158 88515 • support@shelfmerch.com', { size: 9 });

            y += 20;

            // Order/Payment table
            const orderId =
                fullInvoice.orderId?._id?.slice(-8) ||
                fullInvoice.orderId ||
                '—';
            const storeName = fullInvoice.storeId?.name || '—';
            const paymentMethod = fullInvoice.paymentDetails?.method?.toUpperCase() || 'UPI';
            const txnId = fullInvoice.paymentDetails?.transactionId || `TXN-${fullInvoice._id?.slice(-10)}`;

            addLine(`Order ID: ${orderId}`, { size: 10, bold: true });
            addLine(`Store: ${storeName}`, { size: 10 });
            y += 6;
            addLine(`Payment: ${paymentMethod}`, { size: 10 });
            addLine(`Txn ID: ${txnId}`, { size: 10 });

            y += 6;
            addLine('Currency: INR', { size: 10 });

            y += 24;

            // Billing section
            addLine('BILLING', { bold: true, size: 12 });
            y += 8;

            // Bill From
            addLine('Bill From', { bold: true, size: 10 });
            addLine('ShelfMerch (Platform)', { size: 9 });
            addLine('G2, Win-Win Towers, Siddhi Vinayak Nagar, Madhapur,', { size: 9 });
            addLine('Hyderabad, Telangana 500081', { size: 9 });
            addLine('support@shelfmerch.com • 095158 88515', { size: 9 });

            y += 12;

            // Bill To
            addLine('Bill To', { bold: true, size: 10 });
            const merchantName = fullInvoice.merchantId?.name || 'Merchant';
            const merchantEmail = fullInvoice.merchantId?.email || '';
            const merchantPhone = fullInvoice.merchantId?.phone || '';
            const storeCity = fullInvoice.storeId?.city || '';
            const storeState = fullInvoice.storeId?.state || '';

            addLine(merchantName, { size: 9 });
            addLine([storeCity, storeState].filter(Boolean).join(', ') || '—', { size: 9 });
            addLine(
                [merchantEmail, merchantPhone].filter(Boolean).join(' • ') || merchantEmail || merchantPhone || '—',
                { size: 9 },
            );

            y += 20;

            // Items header
            addLine('ITEMS', { bold: true, size: 12 });
            y += 10;

            // Items table
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Product (SKU)', marginLeft, y);
            doc.text('Size', marginLeft + 200, y);
            doc.text('Qty', marginLeft + 260, y);
            doc.text('Unit Price', marginLeft + 300, y);
            doc.text('Amount', marginLeft + 380, y);
            y += 10;
            doc.setLineWidth(0.5);
            doc.line(marginLeft, y, marginLeft + 430, y);
            y += 12;

            doc.setFont('helvetica', 'normal');
            const items = Array.isArray(fullInvoice.items) ? fullInvoice.items : [];

            let subtotal = 0;
            items.forEach((item: any) => {
                // Use SKU as product name (variant-specific)
                const productSku = item.productName || item.variant?.sku || 'Product';
                const size = item.variant?.size || '—';
                const qty = item.quantity || 1;
                const unitPrice = item.productionCost || 0;
                const lineTotal = unitPrice * qty;
                subtotal += lineTotal;

                // Product SKU (multi-line if needed)
                const skuLines = doc.splitTextToSize(productSku, 180);
                skuLines.forEach((line: string, idx: number) => {
                    doc.text(line, marginLeft, y + idx * 11);
                });

                doc.text(size, marginLeft + 200, y);
                doc.text(String(qty), marginLeft + 260, y);
                // Right-align unit price - ensure font is set before calculating width
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                const unitPriceText = formatCurrency(unitPrice);
                const unitPriceWidth = doc.getTextWidth(unitPriceText);
                doc.text(unitPriceText, marginLeft + 300 + 60 - unitPriceWidth, y);
                // Right-align amount - ensure font is set before calculating width
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                const amountText = formatCurrency(lineTotal);
                const amountWidth = doc.getTextWidth(amountText);
                doc.text(amountText, marginLeft + 380 + 50 - amountWidth, y);

                y += Math.max(skuLines.length * 11, 14) + 4;
            });

            if (!items.length) {
                addLine('No line items', { size: 9 });
                y += 4;
            }

            y += 10;

            // Totals
            const shipping = fullInvoice.shippingCost || 0;
            const tax = fullInvoice.tax || 0;
            const total = fullInvoice.totalAmount || subtotal + shipping + tax;
            const rightColX = marginLeft + 430;
            const labelX = rightColX - 120;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            // Base Price
            doc.text('Base Price', labelX, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            const subtotalText = formatCurrency(subtotal);
            const subtotalWidth = doc.getTextWidth(subtotalText);
            doc.text(subtotalText, rightColX - subtotalWidth, y);
            y += 14;

            // Shipping
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('Shipping', labelX, y);
            const shippingText = formatCurrency(shipping);
            const shippingWidth = doc.getTextWidth(shippingText);
            doc.text(shippingText, rightColX - shippingWidth, y);
            y += 14;

            // Tax
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text('Tax', labelX, y);
            const taxText = formatCurrency(tax);
            const taxWidth = doc.getTextWidth(taxText);
            doc.text(taxText, rightColX - taxWidth, y);
            y += 16;

            // Total (Cost)
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('Total (Cost)', labelX, y);
            // Keep bold font for the value to match the label
            const totalText = formatCurrency(total);
            const totalWidth = doc.getTextWidth(totalText);
            doc.text(totalText, rightColX - totalWidth, y);
            y += 18;

            if (retailTotal > 0) {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text('Customer Paid', labelX, y);
                const customerPaidText = formatCurrency(retailTotal);
                const customerPaidWidth = doc.getTextWidth(customerPaidText);
                doc.text(customerPaidText, rightColX - customerPaidWidth, y);
                y += 14;
            }

            if (merchantProfit > 0) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(34, 197, 94); // green
                doc.text('Merchant Profit', labelX - 20, y);
                // Keep bold font for the value to match the label
                const profitText = formatCurrency(merchantProfit);
                const profitWidth = doc.getTextWidth(profitText);
                doc.text(profitText, rightColX - profitWidth, y);
                doc.setTextColor(0, 0, 0);
                y += 24;
            } else {
                y += 8;
            }

            // Footer
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('System-generated invoice • For billing queries: support@shelfmerch.com', marginLeft, y);

            doc.save(`${invoiceNumber}.pdf`);
            toast.success('Invoice PDF downloaded successfully');
        } catch (err) {
            console.error('Failed to generate invoice PDF', err);
            toast.error('Failed to generate PDF');
        }
    };

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Wallet & Invoices</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your fulfillment costs and invoices
                        </p>
                    </div>
                    <Card className="p-4 bg-primary/5 border-primary/20">
                        <div className="flex items-center gap-3">
                            <Wallet className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Wallet Balance</p>
                                <p className="text-xl font-bold">
                                    ₹{walletBalance ? walletBalance.balanceRupees : '0.00'}
                                </p>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <Button size="sm" asChild>
                                    <Link to="/wallet/top-up">Top Up</Link>
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                    <Link to="/wallet/transactions">
                                        <History className="h-3 w-3 mr-1" />
                                        History
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

                {isLoading ? (
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">Loading invoices...</p>
                ) : invoices.length === 0 ? (
                    <Card className="p-12 text-center border-dashed">
                        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-lg font-medium">No invoices yet.</p>
                        <p className="text-muted-foreground">Your fulfillment invoices will appear here once you receive orders.</p>
                    </Card>
                ) : (
                    <Card className="overflow-hidden border-shadow">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">Invoice</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">Store/Order</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">Order Total</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wider">Profit</th>
                                        <th className="px-6 py-4 text-right text-sm font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {invoices.map((inv) => {
                                        const retailTotal = inv.customerPaidAmount || inv.orderId?.total || 0;
                                        const profit = inv.merchantProfit || (retailTotal > 0 ? retailTotal - inv.totalAmount : 0);

                                        return (
                                            <tr key={inv._id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-foreground">{inv.invoiceNumber}</span>
                                                        <span className="text-xs text-muted-foreground">Fulfillment</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium flex items-center gap-1">
                                                            {inv.storeId?.name || 'Store'}
                                                        </span>
                                                        <div className="text-xs text-primary hover:underline flex items-center gap-1">
                                                            Order #{inv.orderId?._id?.slice(-8) || 'N/A'}
                                                            <ExternalLink className="h-3 w-3" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground italic">
                                                    {new Date(inv.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className={`capitalize ${getStatusColor(inv.status)}`}>
                                                        {inv.status === 'paid' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
                                                        {getStatusLabel(inv.status)}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-foreground">₹{retailTotal.toFixed(2)}</span>
                                                        <span className="text-xs text-muted-foreground italic">Cost: ₹{inv.totalAmount?.toFixed(2)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-green-600">₹{profit.toFixed(2)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {inv.status === 'paid' ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="font-medium"
                                                            onClick={() => handleDownloadPdf(inv)}
                                                        >
                                                            <Download className="h-4 w-4 mr-2" />
                                                            Download PDF
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm" className="font-medium" asChild>
                                                            <Link to="/wallet/top-up">
                                                                Top Up
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

export default MerchantInvoices;