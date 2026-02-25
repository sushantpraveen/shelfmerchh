import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shopifyApi } from '@/lib/shopifyApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, RefreshCw, ArrowLeft, Package } from 'lucide-react';

interface ShopifyProduct {
    shopifyProductId: number;
    title: string;
    handle: string;
    status: string;
    vendor: string;
    updatedAtShopify: string;
}

const ShopifyProducts: React.FC = () => {
    const { shop } = useParams<{ shop: string }>();
    const decodedShop = decodeURIComponent(shop || '');
    const [products, setProducts] = useState<ShopifyProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProducts = async () => {
        if (!decodedShop) return;
        setLoading(true);
        setError(null);
        try {
            const response = await shopifyApi.getProducts(decodedShop);
            setProducts(response.products || []);
        } catch (err: any) {
            console.error('Failed to fetch products:', err);
            setError(err.message || 'Failed to load products');
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [decodedShop]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link to="/dashboard/shopify">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Synced Products</h1>
                        <p className="text-muted-foreground">{decodedShop}</p>
                    </div>
                </div>
                <Button onClick={fetchProducts} disabled={loading} variant="outline" size="sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Products</CardTitle>
                            <CardDescription>Showing locally synced products from Shopify.</CardDescription>
                        </div>
                        <div className="bg-primary/10 px-3 py-1 rounded-full flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">{products.length} Products</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading && products.length === 0 ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-destructive">
                            <p>{error}</p>
                            <Button onClick={fetchProducts} variant="link" className="mt-2">Try Again</Button>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed rounded-lg bg-muted/20">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground">No products found for this store.</p>
                            <p className="text-xs text-muted-foreground mt-1">Try triggering a manual sync from the dashboard.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Handle</TableHead>
                                        <TableHead>Shopify ID</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Vendor</TableHead>
                                        <TableHead className="text-right">Last Optimized (Shopify)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow key={product.shopifyProductId}>
                                            <TableCell className="font-medium">{product.title}</TableCell>
                                            <TableCell className="text-muted-foreground">{product.handle}</TableCell>
                                            <TableCell className="font-mono text-xs">{product.shopifyProductId}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-xs ${product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {product.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>{product.vendor}</TableCell>
                                            <TableCell className="text-right">{formatDate(product.updatedAtShopify)}</TableCell>
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

export default ShopifyProducts;
