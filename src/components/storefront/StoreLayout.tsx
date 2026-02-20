import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import EnhancedStoreHeader from './EnhancedStoreHeader';
import EnhancedFooter from './EnhancedFooter';
import CartDrawer from './CartDrawer';
import { Store, Product } from '@/types';
import { storeApi, storeProductsApi } from '@/lib/api';
import { getTenantSlugFromLocation, buildStorePath } from '@/utils/tenantUtils';
import { getTheme } from '@/lib/themes';
import SectionRenderer from '@/components/builder/SectionRenderer';
import { Loader2 } from 'lucide-react';

interface StoreLayoutProps {
    children: React.ReactNode;
    store?: Store | null;
    products?: Product[];
    onSearchClick?: () => void;
}

const StoreLayout: React.FC<StoreLayoutProps> = ({ children, store: propStore, products: propProducts, onSearchClick }) => {
    const params = useParams<{ subdomain: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { cart, cartCount, updateQuantity, removeFromCart, isCartOpen, setIsCartOpen } = useCart();
    const { isAuthenticated } = useStoreAuth();

    // Get tenant slug from subdomain (hostname) or path parameter (fallback)
    const subdomain = getTenantSlugFromLocation(location, params) || params.subdomain;
    const [store, setStore] = useState<Store | null>(propStore || null);
    const [loading, setLoading] = useState(!propStore);
    const [products, setProducts] = useState<Product[]>(propProducts || []);

    useEffect(() => {
        if (propStore) {
            setStore(propStore);
            setLoading(false);
            if (propProducts) setProducts(propProducts);
            return;
        }
        const loadStoreData = async () => {
            if (!subdomain) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const response = await storeApi.getBySubdomain(subdomain);
                if (response && response.success && response.data) {
                    const foundStore = response.data as Store;
                    setStore(foundStore);

                    // Load public products for builder components if any
                    const pResp = await storeProductsApi.listPublic(foundStore.id);
                    if (pResp.success) {
                        setProducts(pResp.data || []);
                    }
                } else {
                    setStore(null);
                }
            } catch (err) {
                console.error('Failed to load store for layout', err);
                setStore(null);
            } finally {
                setLoading(false);
            }
        };
        loadStoreData();
    }, [subdomain]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading store...</p>
                </div>
            </div>
        );
    }

    if (!store) {
        return <>{children}</>;
    }

    const theme = getTheme(store.theme);
    const primaryColor = (store as any)?.settings?.primaryColor || theme.colors.primary || '#16a34a';

    const handleCheckout = () => {
        if (!isAuthenticated) {
            const authPath = buildStorePath('/auth?redirect=checkout', store.subdomain);
            navigate(authPath, { state: { cart } });
            return;
        }
        setIsCartOpen(false);
        navigate(buildStorePath('/checkout', store.subdomain), {
            state: { cart, storeId: store.id, subdomain: store.subdomain },
        });
    };

    // Check if store is using builder for Header/Footer
    const usingBuilder = store.useBuilder && store.builder;

    const getBuilderSection = (type: 'header' | 'footer') => {
        if (!usingBuilder) return null;
        for (const page of store.builder!.pages) {
            const section = page.sections.find((s) => s.type === type && s.visible);
            if (section) return section;
        }
        return null;
    };

    const builderHeader = getBuilderSection('header');
    const builderFooter = getBuilderSection('footer');

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            {builderHeader ? (
                <SectionRenderer
                    section={builderHeader}
                    products={products}
                    globalStyles={store.builder!.globalStyles}
                    isPreview={false}
                    storeSlug={store.subdomain}
                />
            ) : (
                <EnhancedStoreHeader
                    storeName={store.storeName}
                    storeSlug={store.subdomain}
                    navLinks={[
                        { name: 'Products', href: buildStorePath('/products', store.subdomain) },
                        { name: 'About', href: buildStorePath('/', store.subdomain) + '#about' },
                        { name: 'Contact', href: '/support/contact-us' },
                    ]}
                    cartItemCount={cartCount}
                    onCartClick={() => setIsCartOpen(true)}
                    onSearchClick={onSearchClick}
                    primaryColor={primaryColor}
                />
            )}

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            {builderFooter ? (
                <SectionRenderer
                    section={builderFooter}
                    products={products}
                    globalStyles={store.builder!.globalStyles}
                    isPreview={false}
                    storeSlug={store.subdomain}
                />
            ) : (
                <EnhancedFooter
                    storeName={store.storeName}
                    description={store.description || 'Premium custom merchandise'}
                    storeSlug={store.subdomain}
                />
            )}

            {/* Global Cart Drawer */}
            <CartDrawer
                open={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                onCheckout={handleCheckout}
            />
        </div>
    );
};

export default StoreLayout;
