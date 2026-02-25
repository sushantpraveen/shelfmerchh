import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shopifyApi } from '@/lib/shopifyApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, RefreshCw, ExternalLink, Package, ShoppingBag, Plus } from 'lucide-react';

interface ShopifyStore {
    shop: string;
    isActive: boolean;
    lastSyncAt: string | null;
    scopes: string[] | string;
    createdAt: string;
    updatedAt: string;
}

const ShopifyDashboard: React.FC = () => {
    const [stores, setStores] = useState<ShopifyStore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connectShop, setConnectShop] = useState('');
    const [syncing, setSyncing] = useState<Record<string, boolean>>({});

    const fetchStores = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await shopifyApi.getStores();
            setStores(response.stores || []);
        } catch (err: any) {
            console.error('Failed to fetch stores:', err);
            setError(err.message || 'Failed to load stores');
            toast.error('Failed to load stores');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    const handleConnect = async () => {
        let shopInput = connectShop.trim();

        if (!shopInput) {
            toast.error('Please enter a shop domain');
            return;
        }

        // Normalize: remove https:///http:// and trailing slashes
        shopInput = shopInput.replace(/^https?:\/\//, '').replace(/\/$/, '');

        // If domain doesn't have a dot, assume it's just the shop handle
        if (!shopInput.includes('.')) {
            shopInput = `${shopInput}.myshopify.com`;
        }

        // Final validation
        if (!shopInput.endsWith('.myshopify.com')) {
            toast.error('Please enter a valid .myshopify.com domain');
            return;
        }

        try {
            toast.loading(`Redirecting to Shopify for ${shopInput}...`, { id: 'connect' });

            const token = localStorage.getItem('token');
            const publicBase = import.meta.env.VITE_SHOPIFY_PUBLIC_BASE_URL || 'https://bumblingly-graspless-fran.ngrok-free.dev';

            // FORCE NGROK DOMAIN for connection start. 
            // This ensures cookies are set on the same domain as the callback.
            const startUrl = `${publicBase}/api/shopify/start?shop=${encodeURIComponent(shopInput)}&token=${token}`;

            window.location.assign(startUrl);
        } catch (err: any) {
            console.error('Failed to start navigation flow:', err);
            toast.error(err.message || 'Failed to connect to Shopify', { id: 'connect' });
        }
    };

    const handleSync = async (shop: string, mode: 'products' | 'orders') => {
        const key = `${shop}-${mode}`;
        setSyncing(prev => ({ ...prev, [key]: true }));
        try {
            const result = await shopifyApi.syncOrders(shop, mode);
            toast.success(`Sync ${mode} successful for ${shop}`);
            // Refresh list to update lastSyncAt
            fetchStores();
        } catch (err: any) {
            console.error(`Sync error (${mode}):`, err);
            toast.error(`Sync failed: ${err.message}`);
        } finally {
            setSyncing(prev => ({ ...prev, [key]: false }));
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    const formatScopes = (scopes: string[] | string) => {
        if (Array.isArray(scopes)) return scopes.join(', ');
        return scopes || '-';
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Shopify Integration</h1>
                <Button onClick={fetchStores} disabled={loading} variant="outline" size="sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Connect New Store</CardTitle>
                    <CardDescription>Enter your Shopify store domain (e.g., example.myshopify.com) to connect it.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 max-w-md">
                        <Input
                            placeholder="store-name.myshopify.com"
                            value={connectShop}
                            onChange={(e) => setConnectShop(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
                        />
                        <Button onClick={handleConnect}>
                            <Plus className="h-4 w-4 mr-2" />
                            Connect
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Connected Stores</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading && stores.length === 0 ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">
                            <p>{error}</p>
                            <Button onClick={fetchStores} variant="link" className="mt-2">Try Again</Button>
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
                            <p className="text-muted-foreground">No Shopify stores connected yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Shop</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Sync</TableHead>
                                        <TableHead>Scopes</TableHead>
                                        <TableHead>Connected At</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stores.map((store) => (
                                        <TableRow key={store.shop}>
                                            <TableCell className="font-medium">{store.shop}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs ${store.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {store.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </TableCell>
                                            <TableCell>{formatDate(store.lastSyncAt)}</TableCell>
                                            <TableCell className="max-w-[150px] truncate" title={formatScopes(store.scopes)}>
                                                {formatScopes(store.scopes)}
                                            </TableCell>
                                            <TableCell>{formatDate(store.createdAt)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => handleSync(store.shop, 'products')}
                                                        disabled={syncing[`${store.shop}-products`]}
                                                    >
                                                        {syncing[`${store.shop}-products`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
                                                        Sync Products
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => handleSync(store.shop, 'orders')}
                                                        disabled={syncing[`${store.shop}-orders`]}
                                                    >
                                                        {syncing[`${store.shop}-orders`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4 mr-2" />}
                                                        Sync Orders
                                                    </Button>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link to={`/dashboard/shopify/${encodeURIComponent(store.shop)}/products`}>
                                                            <ExternalLink className="h-4 w-4 mr-2" />
                                                            View Products
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ShopifyDashboard;
