const mongoose = require('mongoose');

/**
 * Migration Utility: Drops legacy unique indexes and ensures correct compound indexes for multi-merchant support.
 */
const runShopifyIndexMigration = async () => {
  try {
    const db = mongoose.connection.db;

    const collections = [
      { name: 'shopifystores', legacy: 'shop_1', compound: 'merchantId_1_shop_1', keys: { merchantId: 1, shop: 1 } },
      { name: 'shopifyproducts', legacy: 'shop_1_shopifyProductId_1', compound: 'merchantId_1_shop_1_shopifyProductId_1', keys: { merchantId: 1, shop: 1, shopifyProductId: 1 } },
      { name: 'shopifyorders', legacy: 'shop_1_shopifyOrderId_1', compound: 'merchantId_1_shop_1_shopifyOrderId_1', keys: { merchantId: 1, shop: 1, shopifyOrderId: 1 } }
    ];

    for (const coll of collections) {
      try {
        const collection = db.collection(coll.name);
        const indexes = await collection.listIndexes().toArray();
        const indexNames = indexes.map(idx => idx.name);

        // 1. Drop Legacy Unique Index if exists
        const legacyIdx = indexes.find(idx => idx.name === coll.legacy);
        if (legacyIdx && legacyIdx.unique) {
          console.log(`[Migration] Dropping legacy unique index "${coll.legacy}" from ${coll.name}...`);
          await collection.dropIndex(coll.legacy);
          console.log(`[Migration] ✅ Index "${coll.legacy}" dropped from ${coll.name}.`);
        }

        // 2. Ensure Compound Unique Index exists
        if (!indexNames.includes(coll.compound)) {
          console.log(`[Migration] Creating compound unique index "${coll.compound}" on ${coll.name}...`);
          await collection.createIndex(coll.keys, { unique: true, name: coll.compound });
          console.log(`[Migration] ✅ Compound unique index "${coll.compound}" created on ${coll.name}.`);
        } else {
          console.log(`[Migration] ✅ Verified: compound unique index "${coll.compound}" exists on ${coll.name}.`);
        }
      } catch (err) {
        console.warn(`[Migration] Warning: Could not process indexes on ${coll.name}:`, err.message);
      }
    }

    console.log('[Migration] ✅ Shopify index migration completed.');

  } catch (error) {
    console.error('[Migration] ❌ Error during Shopify index migration:', error.message);
  }
};

module.exports = { runShopifyIndexMigration };
