/**
 * Security utilities for authentication and redirects
 */

const WHITELISTED_DOMAINS = [
  'localhost:8080',
  'localhost:8085',
  'shelfmerch.com',
  'www.shelfmerch.com',
  'shelfmerch.in',
  'www.shelfmerch.in'
];

/**
 * Returns the validated client URL based on request headers or environment
 * @param {Object} req - Express request object
 * @returns {string} - Whitelisted client URL
 */
const getClientUrl = (req) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // 1. Try to get domain from origin or referer
  let sourceDomain = '';
  if (origin) {
    sourceDomain = new URL(origin).host;
  } else if (referer) {
    sourceDomain = new URL(referer).host;
  }

  // 2. Check if source domain is in whitelist
  const isWhitelisted = WHITELISTED_DOMAINS.some(domain => 
    sourceDomain === domain || sourceDomain.endsWith(`.${domain}`)
  );

  console.log(`🛡️ Security Check - Origin: ${origin || 'N/A'}, Referer: ${referer || 'N/A'}, Computed Host: ${sourceDomain}`);

  if (isWhitelisted && origin) {
    console.log(`✅ Origin whitelisted: ${origin}`);
    return origin.endsWith('/') ? origin.slice(0, -1) : origin;
  }

  // 3. Fallback to environment variables
  const fallback = process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' 
    ? 'https://shelfmerch.com' 
    : 'http://localhost:8080');
  
  console.log(`⚠️ Using fallback client URL: ${fallback}`);
  return fallback.endsWith('/') ? fallback.slice(0, -1) : fallback;
};

/**
 * Validates if a redirect URL is safe
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
const isSafeRedirect = (url) => {
  try {
    const parsed = new URL(url);
    return WHITELISTED_DOMAINS.some(domain => 
      parsed.host === domain || parsed.host.endsWith(`.${domain}`)
    );
  } catch (err) {
    return false;
  }
};

module.exports = {
  getClientUrl,
  isSafeRedirect,
  WHITELISTED_DOMAINS
};
