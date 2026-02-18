import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getProductImageGroups } from '@/utils/productImageUtils';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Package,
    ChevronRight,
    Calendar,
    CreditCard,
    Loader2,
    ArrowLeft,
    ExternalLink
} from 'lucide-react';
import { buildStorePath } from '@/utils/tenantUtils';
import EnhancedStoreHeader from '@/components/storefront/EnhancedStoreHeader';
import { storeApi, storeCustomerOrdersApi } from '@/lib/api';
import { Store } from '@/types';
import { Badge } from '@/components/ui/badge';

interface StoreOrderSummary {
    _id: string;
    createdAt?: string;
    total?: number;
    status: string;
    payment?: {
        method?: string;
    };
    invoiceNumber?: string;
    items?: Array<{
        productId?: { _id: string } | string;
        storeProductId?: any;
        productName: string;
        mockupUrl?: string;
        imageUrl?: string;
        quantity: number;
        price: number;
        variant?: {
            color?: string;
            size?: string;
        };
        variantId?: { imageUrl?: string };
        variantName?: string;
    }>;
    orderStatus?: string;
    totalAmount?: number;
    paymentMethod?: string;
}

const StoreOrdersPage: React.FC = () => {
    const navigate = useNavigate();
    const { subdomain } = useParams<{ subdomain: string }>();
    const { customer, isAuthenticated, isLoading: authLoading } = useStoreAuth();
    const { cartCount, setIsCartOpen } = useCart(); // Connect to cart context

    const [store, setStore] = useState<Store | null>(null);
    const [orders, setOrders] = useState<StoreOrderSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    useEffect(() => {
        const loadStore = async () => {
            if (!subdomain) return;
            const resp = await storeApi.getBySubdomain(subdomain);
            if (resp.success) setStore(resp.data);
        };
        loadStore();
    }, [subdomain]);

    useEffect(() => {
        const loadOrders = async () => {
            if (!subdomain || !isAuthenticated) return;

            try {
                const data = await storeCustomerOrdersApi.list(subdomain);
                if (data.success) {
                    setOrders(data.data || []);
                }
            } catch (err) {
                console.error('Failed to load orders', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (!authLoading) {
            loadOrders();
        }
    }, [subdomain, isAuthenticated, authLoading]);

    if (authLoading || (isLoading && isAuthenticated)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
        );
    }

    if (!isAuthenticated || !subdomain) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
                <Package className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <h1 className="text-2xl font-bold mb-2">My Orders</h1>
                <p className="text-muted-foreground mb-6">Sign in to view your order history.</p>
                <Button asChild className="bg-green-600 hover:bg-green-700">
                    <Link to={buildStorePath('/auth', subdomain || '')}>Sign In</Link>
                </Button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
            case 'shipped': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'processing': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-muted text-muted-foreground';
        }
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
                <div className="mb-8">
                    <Link
                        to={buildStorePath('/', subdomain)}
                        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Home
                    </Link>
                    <div className="flex items-end gap-3">
                        <Package className="h-8 w-8 text-green-600" />
                        <div>
                            <h1 className="text-3xl font-bold leading-tight">My Orders</h1>
                            <p className="text-muted-foreground">Track and manage your past purchases.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {orders.length > 0 ? (
                        orders.map((order) => (
                            <Card key={order._id} className="border-none shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group">
                                <CardContent className="p-0">
                                    <div className="bg-muted/30 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b">
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">Order ID</p>
                                                <p className="text-sm font-bold flex items-center gap-1">
                                                    #{order._id.slice(-6).toUpperCase()}
                                                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-40" />
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">Date</p>
                                                <p className="text-sm font-medium flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {new Date(order.createdAt || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5">Total</p>
                                                <p className="text-sm font-bold text-green-700">₹{order.totalAmount || order.total}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`rounded-full px-3 py-1 font-semibold text-[11px] uppercase tracking-wider ${getStatusColor(order.orderStatus || order.status)}`}>
                                            {order.orderStatus || order.status}
                                        </Badge>
                                    </div>

                                    <div className="p-6 space-y-4">
                                        {order.items && order.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-4 items-center">
                                                <div className="h-16 w-16 bg-muted rounded-xl overflow-hidden flex-shrink-0 border border-border/50">
                                                    {getItemImage(item) ? (
                                                        <img
                                                            src={getItemImage(item)}
                                                            alt={item.productName}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center">
                                                            <Package className="h-6 w-6 text-muted-foreground/30" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {item.productId || item.storeProductId ? (
                                                        <Link
                                                            to={buildStorePath(`/product/${typeof item.productId === 'object' ? item.productId._id : (item.storeProductId || item.productId)}`, subdomain)}
                                                            className="text-sm font-bold hover:text-green-600 transition-colors line-clamp-1 flex items-center gap-1"
                                                        >
                                                            {item.productName}
                                                            <ChevronRight className="h-3 w-3" />
                                                        </Link>
                                                    ) : (
                                                        <p className="text-sm font-bold line-clamp-1">{item.productName}</p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {(item.variant?.size || item.variant?.color) && (
                                                            <span>
                                                                {item.variant?.size}{item.variant?.size && item.variant?.color ? ' / ' : ''}{item.variant?.color}
                                                            </span>
                                                        )}
                                                        {(item.variant?.size || item.variant?.color) && <span className="mx-1.5">•</span>}
                                                        <span>Quantity: {item.quantity}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold">₹{(item.price || 0) * (item.quantity || 1)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="px-6 py-4 bg-muted/10 flex items-center justify-between border-t text-xs">
                                        <div className="flex items-center gap-4 text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <CreditCard className="h-3 w-3" />
                                                Paid via {order.paymentMethod || 'Razorpay'}
                                            </span>
                                            {order.invoiceNumber && (
                                                <span className="font-medium">Invoice: {order.invoiceNumber}</span>
                                            )}
                                        </div>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="h-8 rounded-lg text-[11px] font-bold uppercase transition-transform active:scale-95"
                                            asChild
                                        >
                                            <Link to={buildStorePath(`/orders/${order._id}`, subdomain)}>
                                                View Details
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center bg-card rounded-3xl shadow-sm border border-dashed border-border">
                            <div className="p-6 bg-green-50 rounded-full mb-4">
                                <Package className="h-12 w-12 text-green-200" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">No orders found</h2>
                            <p className="text-muted-foreground max-w-xs mb-8">
                                Looks like you haven't placed any orders yet. Start shopping to fill this space!
                            </p>
                            <Button asChild className="bg-green-600 hover:bg-green-700 rounded-xl px-8 py-6 h-auto text-lg font-bold shadow-green-200 shadow-xl transition-all hover:-translate-y-1">
                                <Link to={buildStorePath('/', subdomain)}>Browse Products</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StoreOrdersPage;
