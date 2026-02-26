/**
 * Migration: Cleanup duplicate ShopifyStore records by shop.
 * 
 * Run ONCE before deploying the new unique { shop } index.
 * Usage: node backend/scripts/cleanup-shopify-duplicates.js
 * 
 * For each shop with multiple records, keeps the BEST record using priority:
 *   1. isActive=true AND accessToken not null
 *   2. Most recent installedAt
 *   3. Most recent updatedAt
 * Deletes all other duplicates.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

async function cleanup() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ No MONGODB_URI or MONGO_URI found in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const collection = mongoose.connection.collection('shopifystores');

  // Find shops with duplicates
  const dupes = await collection.aggregate([
    { $group: { _id: '$shop', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log(`Found ${dupes.length} shops with duplicate records`);

  let totalDeleted = 0;

  for (const dupe of dupes) {
    const shop = dupe._id;
    const records = await collection.find({ shop }).sort({
      isActive: -1,           // active first
      installedAt: -1,        // newest install first
      updatedAt: -1           // newest update first
    }).toArray();

    // Best = first record after sorting (active + newest)
    // But prefer one with accessToken
    let keepIdx = 0;
    for (let i = 0; i < records.length; i++) {
      if (records[i].isActive && records[i].accessToken) {
        keepIdx = i;
        break;
      }
    }

    const keep = records[keepIdx];
    const deleteIds = records.filter((_, i) => i !== keepIdx).map(r => r._id);

    console.log(`  Shop: ${shop} — keeping _id=${keep._id}, deleting ${deleteIds.length} dupes`);
    
    if (deleteIds.length > 0) {
      const result = await collection.deleteMany({ _id: { $in: deleteIds } });
      totalDeleted += result.deletedCount;
    }
  }

  console.log(`\n✅ Done. Deleted ${totalDeleted} duplicate records.`);

  // Now drop the old compound index if it exists
  try {
    await collection.dropIndex('merchantId_1_shop_1');
    console.log('✅ Dropped old compound index {merchantId, shop}');
  } catch (e) {
    console.log('ℹ️  Old compound index not found (may already be dropped):', e.message);
  }

  // Create the new unique shop index
  try {
    await collection.createIndex({ shop: 1 }, { unique: true });
    console.log('✅ Created new unique index {shop}');
  } catch (e) {
    console.error('❌ Failed to create unique shop index:', e.message);
    console.error('   There may still be duplicates. Check manually.');
  }

  await mongoose.disconnect();
  console.log('✅ Disconnected');
}

cleanup().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
