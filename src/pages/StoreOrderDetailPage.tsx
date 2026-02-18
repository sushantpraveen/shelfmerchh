import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getProductImageGroups } from '@/utils/productImageUtils';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Package,
    ChevronRight,
    Calendar,
    CreditCard,
    Loader2,
    ArrowLeft,
    MapPin,
    Truck,
    Clock,
    ShoppingBag
} from 'lucide-react';
import { buildStorePath } from '@/utils/tenantUtils';
import EnhancedStoreHeader from '@/components/storefront/EnhancedStoreHeader';
import { storeApi, storeCustomerOrdersApi } from '@/lib/api';
import { Store } from '@/types';

interface OrderItem {
    productName: string;
    mockupUrl?: string;
    imageUrl?: string;
    quantity: number;
    price: number;
    variant?: {
        color?: string;
        size?: string;
    };
    productId?: any;
    storeProductId?: any;
}

interface OrderDetail {
    _id: string;
    createdAt: string;
    total: number;
    status: string;
    orderStatus?: string;
    payment?: {
        method?: string;
    };
    paymentMethod?: string;
    shippingAddress: {
        addressLine1: string;
        addressLine2?: string;
        city: string;
        state: string;
        pincode: string;
        country: string;
        phone?: string;
        name: string;
    };
    items: OrderItem[];
    invoiceNumber?: string;
}

const StoreOrderDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { subdomain, orderId } = useParams<{ subdomain: string; orderId: string }>();
    const { isAuthenticated, isLoading: authLoading } = useStoreAuth();
    const { cartCount, setIsCartOpen } = useCart();

    const [store, setStore] = useState<Store | null>(null);
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadStore = async () => {
            if (!subdomain) return;
            try {
                const resp = await storeApi.getBySubdomain(subdomain);
                if (resp.success) setStore(resp.data);
            } catch (err) {
                console.error('Failed to load store', err);
            }
        };
        loadStore();
    }, [subdomain]);

    useEffect(() => {
        const loadOrderDetails = async () => {
            if (!subdomain || !orderId || !isAuthenticated) return;

            try {
                setIsLoading(true);
                const resp = await storeCustomerOrdersApi.getById(subdomain, orderId);
                if (resp.success) {
                    setOrder(resp.data);
                } else {
                    setError(resp.message || 'Order not found');
                }
            } catch (err: any) {
                console.error('Failed to load order details', err);
                setError(err.message || 'Failed to load order details');
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading) {
            loadOrderDetails();
        }
    }, [subdomain, orderId, isAuthenticated, authLoading]);

    const getStatusColor = (status: string = '') => {
        const s = status.toLowerCase();
        if (s.includes('paid') || s.includes('delivered')) return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('pending') || s.includes('hold')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        if (s.includes('cancel') || s.includes('refund')) return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-blue-100 text-blue-700 border-blue-200';
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const getItemImage = (item: any) => {
        // 1. Try populated storeProductId metadata
        if (item.storeProductId && typeof item.storeProductId === 'object') {
            const { allImages } = getProductImageGroups(item.storeProductId);
            if (allImages.length > 0) return allImages[0];
        }
        // 2. Fallback to order snapshot
        return item.mockupUrl || item.imageUrl;
    };

    if (authLoading || (isLoading && isAuthenticated)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-muted/30 flex flex-col">
                <EnhancedStoreHeader
                    storeName={store?.storeName || 'Store'}
                    storeSlug={subdomain}
                    cartItemCount={cartCount}
                    onCartClick={() => setIsCartOpen(true)}
                    primaryColor={store?.settings?.primaryColor}
                />
                <main className="flex-1 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full text-center p-8">
                        <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-xl font-bold mb-2">Please login to view order details</h2>
                        <Button className="mt-4" onClick={() => navigate(buildStorePath('/auth', subdomain))}>
                            Login to Account
                        </Button>
                    </Card>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/30 flex flex-col">
            <EnhancedStoreHeader
                storeName={store?.storeName || 'Store'}
                storeSlug={subdomain}
                cartItemCount={cartCount}
                onCartClick={() => setIsCartOpen(true)}
                primaryColor={store?.settings?.primaryColor}
            />

            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
                <div className="mb-6 flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full bg-white shadow-sm border"
                        onClick={() => navigate(buildStorePath('/orders', subdomain))}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Order Details</h1>
                        <p className="text-muted-foreground text-sm">#{orderId?.toUpperCase().slice(-8)}</p>
                    </div>
                </div>

                {error ? (
                    <Card className="p-12 text-center border-dashed">
                        <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">{error}</h2>
                        <Button variant="outline" className="mt-4" asChild>
                            <Link to={buildStorePath('/orders', subdomain)}>Back to My Orders</Link>
                        </Button>
                    </Card>
                ) : order && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Order Summary Card */}
                            <Card className="overflow-hidden border-none shadow-sm">
                                <CardHeader className="bg-white border-b pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-50 rounded-lg">
                                                <ShoppingBag className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Placed</p>
                                                <p className="font-bold">{formatDate(order.createdAt)}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`rounded-full px-4 py-1.5 font-bold uppercase tracking-wide text-xs ${getStatusColor(order.orderStatus || order.status)}`}>
                                            {order.orderStatus || order.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y">
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="p-6 flex gap-4">
                                                <div className="h-24 w-24 bg-muted rounded-xl overflow-hidden flex-shrink-0 border">
                                                    {getItemImage(item) ? (
                                                        <img
                                                            src={getItemImage(item)}
                                                            alt={item.productName}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center">
                                                            <Package className="h-8 w-8 text-muted-foreground/30" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-lg mb-1 leading-tight">{item.productName}</h3>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                        {(item.variant?.size || item.variant?.color) && (
                                                            <p className="flex items-center gap-1">
                                                                <span className="font-medium">Variant:</span> {item.variant?.size}{item.variant?.size && item.variant?.color ? ' / ' : ''}{item.variant?.color}
                                                            </p>
                                                        )}
                                                        <p className="flex items-center gap-1">
                                                            <span className="font-medium">Quantity:</span> {item.quantity}
                                                        </p>
                                                    </div>
                                                    <p className="mt-3 font-bold text-green-600">₹{(item.price || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-6 bg-muted/10 border-t">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Subtotal</span>
                                                <span className="font-medium">₹{(order.total || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Shipping</span>
                                                <span className="font-medium text-green-600">FREE</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t mt-2">
                                                <span className="font-bold text-lg">Order Total</span>
                                                <span className="font-black text-xl text-green-600">₹{(order.total || 0).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Payment Info */}
                            <Card className="border-none shadow-sm">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                                        Payment Method
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-4 p-4 border rounded-xl bg-white">
                                        <div className="h-10 w-10 bg-muted/50 rounded-lg flex items-center justify-center">
                                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-bold capitalize">{order.paymentMethod || order.payment?.method || 'Razorpay'}</p>
                                            <p className="text-sm text-muted-foreground">Transaction ID: {order._id}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Shipping Address */}
                            <Card className="border-none shadow-sm h-full">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="h-5 w-5 text-muted-foreground" />
                                        Delivery Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="p-4 bg-muted/20 rounded-xl space-y-1">
                                        <p className="font-bold text-lg">{order.shippingAddress.name}</p>
                                        <p className="text-sm leading-relaxed text-muted-foreground">
                                            {order.shippingAddress.addressLine1}
                                            {order.shippingAddress.addressLine2 && <><br />{order.shippingAddress.addressLine2}</>}
                                            <br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}
                                            <br />{order.shippingAddress.country}
                                        </p>
                                        {order.shippingAddress.phone && (
                                            <p className="text-sm mt-2 font-medium flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" />
                                                Phone: {order.shippingAddress.phone}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1 p-1 bg-blue-50 rounded">
                                                <Truck className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Standard Delivery</p>
                                                <p className="text-xs text-muted-foreground">Usually arrives within 5-7 business days after shipping.</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Help Card */}
                            <Card className="bg-green-600 text-white border-none shadow-sm">
                                <CardContent className="p-6">
                                    <h4 className="font-bold text-lg mb-2">Need Help?</h4>
                                    <p className="text-green-50 text-sm mb-4">If you have any questions about your order, please contact our support team.</p>
                                    <Button variant="secondary" className="w-full font-bold bg-white text-green-600 hover:bg-green-50">
                                        Contact Support
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default StoreOrderDetailPage;
