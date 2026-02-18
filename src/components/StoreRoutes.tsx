/**
 * StoreRoutes Component
 * Handles routing for storefront pages with support for both:
 * - Subdomain-based routing: merch.shelfmerch.in/products
 * - Path-based routing (legacy/dev): shelfmerch.in/store/merch/products
 */

import { Routes, Route, useParams, useLocation } from 'react-router-dom';
import { StoreAuthProvider } from '@/contexts/StoreAuthContext';
import { CartProvider } from '@/contexts/CartContext';
import StoreFrontendNew from '@/pages/StoreFrontendNew';
import StoreProductsPage from '@/pages/StoreProductsPage';
import StoreProductPage from '@/pages/StoreProductPage';
import StoreCheckoutPage from '@/pages/StoreCheckoutPage';
// import StoreCustomerAccountPage from '@/pages/StoreCustomerAccountPage';
import StoreAuthPage from '@/pages/StoreAuthPage';
import StoreProfilePage from '@/pages/StoreProfilePage';
import StoreOrdersPage from '@/pages/StoreOrdersPage';
import StoreSettingsPage from '@/pages/StoreSettingsPage';
import StoreOrderDetailPage from '@/pages/StoreOrderDetailPage';
import { isTenantSubdomain, getTenantSlugFromLocation } from '@/utils/tenantUtils';

/**
 * StoreWrapper - A wrapper component to provide global state contexts
 */
const StoreWrapper = ({ children }: { children: React.ReactNode }) => {
  const params = useParams<{ subdomain?: string }>();
  const location = useLocation();
  const subdomain = getTenantSlugFromLocation(location, params) || '';

  return (
    <StoreAuthProvider subdomain={subdomain}>
      <CartProvider subdomain={subdomain}>
        {children}
      </CartProvider>
    </StoreAuthProvider>
  );
};

export function StoreRoutes() {
  const isSubdomainMode = isTenantSubdomain();

  if (isSubdomainMode) {
    return (
      <StoreWrapper>
        <Routes>
          <Route path="/" element={<StoreFrontendNew />} />
          <Route path="/products" element={<StoreProductsPage />} />
          <Route path="/auth" element={<StoreAuthPage />} />
          {/* <Route path="/account" element={<StoreCustomerAccountPage />} /> */}
          <Route path="/product/:productId" element={<StoreProductPage />} />
          <Route path="/checkout" element={<StoreCheckoutPage />} />
          <Route path="/profile" element={<StoreProfilePage />} />
          <Route path="/orders" element={<StoreOrdersPage />} />
          <Route path="/orders/:orderId" element={<StoreOrderDetailPage />} />
          <Route path="/settings" element={<StoreSettingsPage />} />
        </Routes>
      </StoreWrapper>
    );
  }

  return (
    <StoreWrapper>
      <Routes>
        <Route path="/store/:subdomain" element={<StoreFrontendNew />} />
        <Route path="/store/:subdomain/products" element={<StoreProductsPage />} />
        <Route path="/store/:subdomain/auth" element={<StoreAuthPage />} />
        {/* <Route path="/store/:subdomain/account" element={<StoreCustomerAccountPage />} /> */}
        <Route path="/store/:subdomain/product/:productId" element={<StoreProductPage />} />
        <Route path="/store/:subdomain/checkout" element={<StoreCheckoutPage />} />
        <Route path="/store/:subdomain/profile" element={<StoreProfilePage />} />
        <Route path="/store/:subdomain/orders" element={<StoreOrdersPage />} />
        <Route path="/store/:subdomain/orders/:orderId" element={<StoreOrderDetailPage />} />
        <Route path="/store/:subdomain/settings" element={<StoreSettingsPage />} />
      </Routes>
    </StoreWrapper>
  );
}

export default StoreRoutes;
