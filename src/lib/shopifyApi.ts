import { SHOPIFY_API_BASE_URL } from '@/config';
import { ApiError, api } from '@/lib/api';

const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * Get the legacy Shopify Auth URL (direct browser navigation)
 * Note: Browser navigation doesn't send Bearer tokens, so this often fails
 * if the backend route is protected. Use shopifyApi.getAuthUrl() instead.
 */
export const getShopifyAuthUrl = (shop: string): string => {
  const token = getToken();
  const baseUrl = SHOPIFY_API_BASE_URL.endsWith('/') 
    ? SHOPIFY_API_BASE_URL.slice(0, -1) 
    : SHOPIFY_API_BASE_URL;
  
  return `${baseUrl}/shopify/start?shop=${encodeURIComponent(shop)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
};

const shopifyFetch = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = getToken();
  
  // baseUrl should be the specialized Shopify base (which might be ngrok)
  const baseUrl = SHOPIFY_API_BASE_URL.endsWith('/') 
    ? SHOPIFY_API_BASE_URL.slice(0, -1) 
    : SHOPIFY_API_BASE_URL;
    
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${path}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.message || `Shopify API request failed with status ${response.status}`,
      response.status,
      data.errors,
      data
    );
  }

  return data as T;
};

export const shopifyApi = {
  getStores: () => shopifyFetch('/shopify/stores'),
  
  /**
   * Builds the absolute URL to start OAuth flow.
   * MUST use SHOPIFY_API_BASE_URL so it hits the same origin as the callback.
   * Bridges authentication via 'token' query parameter.
   */
  getAuthStartUrl: (shop: string): string => {
    const token = getToken();
    const baseUrl = SHOPIFY_API_BASE_URL.endsWith('/') 
      ? SHOPIFY_API_BASE_URL.slice(0, -1) 
      : SHOPIFY_API_BASE_URL;
    return `${baseUrl}/shopify/start?shop=${encodeURIComponent(shop)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  },

  /**
   * Fetches the signed Shopify install URL from the backend.
   * Useful if we want to fetch the URL first then redirect.
   */
  getAuthUrl: async (shop: string): Promise<string> => {
    // We use specialized shopifyFetch here to ensure it hits ngrok if configured
    const data = await shopifyFetch<{ success: boolean; url: string }>(`/shopify/auth-url?shop=${encodeURIComponent(shop)}`);
    return data.url;
  },
  
  getProducts: (shop: string) => 
    shopifyFetch(`/shopify/products?shop=${encodeURIComponent(shop)}`),
    
  syncOrders: (shop: string, mode: 'products' | 'orders' = 'orders') => 
    shopifyFetch(`/shopify/sync/orders?shop=${encodeURIComponent(shop)}&mode=${mode}`, {
      method: 'POST'
    }),

  syncProducts: (shop: string) => 
    shopifyApi.syncOrders(shop, 'products'),

  linkAccount: (shop: string) =>
    api.post('/shopify/link-account', { shop })
};
