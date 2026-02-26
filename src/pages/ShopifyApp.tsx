import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { shopifyApi } from '@/lib/shopifyApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ShopifyApp Component (Embedded Page)
 * Route: /shopify/app?shop=xxx.myshopify.com
 */
const ShopifyApp: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();
    const [linking, setLinking] = useState(false);
    const [linked, setLinked] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const shop = searchParams.get('shop');
    const location = useLocation();

    useEffect(() => {
        console.log("[ShopifyApp] mounted", {
            path: location.pathname,
            search: location.search,
            shop,
            hasUser: !!user,
            authLoading
        });
    }, []);

    useEffect(() => {
        if (authLoading || !shop || !user) return;

        const performLinking = async () => {
            setLinking(true);
            try {
                await shopifyApi.linkAccount(shop);
                setLinked(true);
            } catch (err: any) {
                console.error('Failed to link account:', err);
                setError(err.message || 'Failed to link account');
                toast.error('Failed to link ShelfMerch account');
            } finally {
                setLinking(false);
            }
        };

        performLinking();
    }, [user, authLoading, shop]);

    // Base UI Layout to ensure something always renders
    const renderContent = () => {
        if (!shop) {
            return (
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-destructive">Error</CardTitle>
                        <CardDescription>Missing shop parameter. Please open this app from your Shopify Admin.</CardDescription>
                    </CardHeader>
                </Card>
            );
        }

        if (authLoading) {
            return <div className="text-muted-foreground text-center py-12">Loading ShelfMerch context...</div>;
        }

        if (!user) {
            // Build relative returnTo preserving shop and host params
            const host = searchParams.get('host');
            let returnPath = `/shopify/app?shop=${encodeURIComponent(shop)}`;
            if (host) returnPath += `&host=${encodeURIComponent(host)}`;
            const returnUrl = encodeURIComponent(returnPath);

            return (
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Welcome to ShelfMerch</CardTitle>
                        <CardDescription>Please login or sign up to connect your store.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <Button
                            className="w-full"
                            onClick={() => window.open(`${window.location.origin}/auth?mode=login&returnTo=${returnUrl}`, '_top')}
                        >
                            Login to ShelfMerch
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => window.open(`${window.location.origin}/auth?mode=signup&returnTo=${returnUrl}`, '_top')}
                        >
                            Sign up for ShelfMerch
                        </Button>
                        <p className="text-xs text-center text-muted-foreground mt-2">
                            Note: Login will attempt to open in the main window.
                        </p>
                    </CardContent>
                </Card>
            );
        }

        return (
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {linked ? <CheckCircle2 className="text-green-500 w-6 h-6" /> : null}
                        {linked ? 'Store Connected' : 'Connecting Store...'}
                    </CardTitle>
                    <CardDescription>
                        Follow the steps below to manage your integration.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm border-b pb-2">
                            <span className="text-muted-foreground">Store:</span>
                            <span className="font-mono font-bold">{shop}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b pb-2">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-bold">
                                {linking ? 'Linking...' : linked ? 'Connected ✅' : 'Not Linked'}
                            </span>
                        </div>
                    </div>

                    {linked && (
                        <div className="pt-4">
                            <Button
                                className="w-full gap-2"
                                onClick={() => window.open('https://shelfmerch.com/designer', '_blank')}
                            >
                                Open ShelfMerch Dashboard
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col gap-3 mt-2">
                            <div className="text-xs text-destructive text-center p-2 bg-destructive/10 rounded">
                                {error}
                            </div>

                            {error.includes('Store not installed') && (
                                <Button
                                    variant="secondary"
                                    className="w-full text-xs"
                                    onClick={() => {
                                        const token = localStorage.getItem('token');
                                        const authUrl = shopifyApi.getAuthStartUrl(shop);
                                        // Use _top to break out of iframe for OAuth redirection
                                        window.open(authUrl, '_top');
                                    }}
                                >
                                    Complete Installation
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="flex flex-col items-center justify-start min-h-screen p-8 bg-slate-50">
            <div className="w-full max-w-md mb-6 text-center border-b pb-4">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">ShelfMerch Shopify App</h1>
                <p className="text-sm text-slate-500">
                    Domain: <span className="font-mono font-semibold">{shop || 'None'}</span>
                </p>
            </div>

            {renderContent()}

            <div className="mt-8 text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                SECURE EMBEDDED CONTEXT
            </div>
        </div>
    );
};

export default ShopifyApp;
