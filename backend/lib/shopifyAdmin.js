const axios = require('axios');

/**
 * Call Shopify GraphQL Admin API
 * Uses SHOPIFY_ADMIN_ACCESS_TOKEN from env
 */
const shopifyGraphql = async (shop, query, variables = {}, customAccessToken = null) => {
  const accessToken = customAccessToken || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error(`Access token missing for ${shop}`);
  }

  const url = `https://${shop}/admin/api/2024-01/graphql.json`;

  try {
    const response = await axios({
      url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      data: {
        query,
        variables,
      },
    });

    if (response.data.errors) {
      console.error(`[Shopify GraphQL] Errors for ${shop}:`, JSON.stringify(response.data.errors, null, 2));
      throw new Error('Shopify GraphQL Error');
    }

    return response.data.data;
  } catch (error) {
    console.error(`[Shopify GraphQL] Network/Request Error for ${shop}:`, error.message);
    throw error;
  }
};

module.exports = { shopifyGraphql };
