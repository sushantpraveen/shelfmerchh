import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { storeApi } from '@/lib/api';
import { Store } from '@/types';
import { getTenantSlugFromLocation, buildStorePath } from '@/utils/tenantUtils';
import { getTheme } from '@/lib/themes';
import SectionRenderer from '@/components/builder/SectionRenderer';
import EnhancedStoreHeader from '@/components/storefront/EnhancedStoreHeader';
import EnhancedFooter from '@/components/storefront/EnhancedFooter';
import { Loader2 } from 'lucide-react';

const StoreCartPage = () => {
  const params = useParams<{ subdomain: string }>();
  const location = useLocation();
  const subdomain = getTenantSlugFromLocation(location, params) || params.subdomain;

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStoreData = useCallback(async () => {
    if (!subdomain) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await storeApi.getBySubdomain(subdomain);
      if (response && response.success && response.data) {
        setStore(response.data as Store);
      } else {
        setStore(null);
      }
    } catch (err) {
      console.error('Failed to fetch store from backend:', err);
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, [subdomain]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const builderHeader = useMemo(() => {
    const builder = store?.builder;
    if (!store?.useBuilder || !builder) return null;
    for (const page of builder.pages) {
      const header = page.sections.find((s) => s.type === 'header' && s.visible);
      if (header) return header;
    }
    return null;
  }, [store]);

  const builderFooter = useMemo(() => {
    const builder = store?.builder;
    if (!store?.useBuilder || !builder) return null;
    for (const page of builder.pages) {
      const footer = page.sections.find((s) => s.type === 'footer' && s.visible);
      if (footer) return footer;
    }
    return null;
  }, [store]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Store Not Found</h1>
          <p className="text-muted-foreground">The store "{subdomain}" does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {builderHeader ? (
        <SectionRenderer section={builderHeader} isPreview={false} globalStyles={store.builder?.globalStyles} storeSlug={store.subdomain} />
      ) : (
        <EnhancedStoreHeader
          storeName={store.storeName}
          storeSlug={store.subdomain}
          navLinks={[
            { name: 'Products', href: buildStorePath('/products', store.subdomain) },
            { name: 'About', href: '#about' },
            { name: 'Contact', href: '/support/contact-us' },
          ]}
          cartItemCount={0}
          onCartClick={() => {}}
          primaryColor={(store as any)?.settings?.primaryColor || getTheme(store.theme).colors.primary || '#16a34a'}
        />
      )}

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">Cart</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Your cart is currently empty.
          </p>
        </div>
      </main>

      {builderFooter ? (
        <SectionRenderer section={builderFooter} isPreview={false} globalStyles={store.builder?.globalStyles} storeSlug={store.subdomain} />
      ) : (
        <EnhancedFooter storeName={store.storeName} description={store.description} storeSlug={store.subdomain} />
      )}
    </div>
  );
};

export default StoreCartPage;


