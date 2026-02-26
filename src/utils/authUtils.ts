/**
 * Checks if the current context is a Shopify embedded app.
 * True if the current path or the stored returnTo starts with /shopify/.
 */
export const isEmbeddedContext = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check current path
  if (window.location.pathname.startsWith('/shopify/')) return true;

  // Check stored returnTo
  const stored = sessionStorage.getItem('returnTo');
  if (stored && stored.startsWith('/shopify/')) return true;

  // Check URL param returnTo
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get('returnTo');
  if (returnTo && returnTo.startsWith('/shopify/')) return true;

  return false;
};

/**
 * Validates a redirect URL and returns a safe destination.
 *
 * Rules:
 * 1. Only relative paths starting with '/' are allowed.
 * 2. Absolute URLs (http://, https://, //) are always rejected.
 * 3. If no valid URL: falls back to /shopify/app?shop=... if shop is known, else /dashboard.
 */
export const getSafeRedirect = (
  url: string | null | undefined,
  fallback: string = '/dashboard',
  shop: string | null | undefined = null
): string => {
  if (url && isSafeRelativePath(url)) {
    return url;
  }

  // Shopify fallback
  if (shop) {
    return `/shopify/app?shop=${encodeURIComponent(shop)}`;
  }

  return fallback;
};

/**
 * Checks if a string is a safe relative path (starts with / but not //).
 */
const isSafeRelativePath = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('//')) return false;
  if (url.startsWith('http://') || url.startsWith('https://')) return false;
  if (!url.startsWith('/')) return false;
  return true;
};
