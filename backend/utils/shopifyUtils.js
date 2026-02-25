const crypto = require('crypto');

/**
 * Verifies the HMAC signature from Shopify webhooks.
 * @param {string} rawBody - The raw request body as a string.
 * @param {string} hmacHeader - The value of the 'x-shopify-hmac-sha256' header.
 * @param {string} secret - The Shopify API App secret (shared secret).
 * @returns {boolean} - True if verification succeeds, false otherwise.
 */
/**
 * Verifies the HMAC signature from Shopify webhooks.
 * @param {Buffer|string} rawBody - The raw request body.
 * @param {string} hmacHeader - The value of 'x-shopify-hmac-sha256' header.
 * @param {string} secret - Shopify App Secret.
 */
const verifyShopifyWebhook = (rawBody, hmacHeader, secret) => {
  if (!hmacHeader || !rawBody || !secret) return false;
  
  try {
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const generatedHmac = crypto
      .createHmac('sha256', secret)
      .update(bodyStr, 'utf8')
      .digest('base64');
      
    const generatedBuffer = Buffer.from(generatedHmac, 'base64');
    const headerBuffer = Buffer.from(hmacHeader, 'base64');

    if (generatedBuffer.length !== headerBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(generatedBuffer, headerBuffer);
  } catch (error) {
    console.error('[Shopify Utils] Webhook HMAC Error:', error.message);
    return false;
  }
};

/**
 * Validates the HMAC for OAuth callback.
 * See: https://shopify.dev/docs/apps/auth/oauth/getting-started#verify-the-installation-request
 */
const verifyShopifyOAuth = (query, secret, rawQuery = '') => {
  const hmac = query.hmac;
  if (!hmac) return false;

  let message;
  
  if (rawQuery) {
    // 1. Use the raw query string to preserve encoding exactly as Shopify sent it
    // Pairs must be sorted lexicographically by key
    message = rawQuery
      .split('&')
      .filter(pair => {
        const key = pair.split('=')[0];
        return key !== 'hmac' && key !== 'signature';
      })
      .sort()
      .join('&');
  } else {
    // 2. Fallback if raw query is missing (re-encoding manually)
    const { hmac: _h, signature: _s, ...params } = query;
    message = Object.keys(params)
      .sort()
      .map(key => {
        const value = params[key];
        const valStr = Array.isArray(value) ? value.join(',') : String(value);
        // Percent-encoding rules: % -> %25, & -> %26, = -> %3D
        const cleanKey = key.replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
        const cleanVal = valStr.replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
        return `${cleanKey}=${cleanVal}`;
      })
      .join('&');
  }

  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  // Debug logs in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Shopify OAuth Verification]');
    console.log('Message String:', message);
    console.log('Computed HMAC:', computedHmac);
    console.log('Received HMAC:', hmac);
  }

  const hashBuffer = Buffer.from(computedHmac, 'hex');
  const hmacBuffer = Buffer.from(hmac, 'hex');

  // Length guard for timingSafeEqual
  if (hashBuffer.length !== hmacBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(hashBuffer, hmacBuffer);
};

module.exports = {
  verifyShopifyWebhook,
  verifyShopifyOAuth
};
