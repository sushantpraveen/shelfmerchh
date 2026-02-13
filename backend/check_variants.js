const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const CatalogProduct = require('./models/CatalogProduct');
const CatalogProductVariant = require('./models/CatalogProductVariant');

async function checkVariants() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const products = await CatalogProduct.find({});
    console.log(`Found ${products.length} catalog products`);

    for (const product of products) {
      const variants = await CatalogProductVariant.find({ catalogProductId: product._id });
      if (variants.length === 0) continue;

      const ceruleanVariants = variants.filter(v => v.color.toLowerCase().includes('cerulean'));
      if (ceruleanVariants.length > 0) {
        console.log(`\nProduct: ${product.name} (ID: ${product._id})`);
        ceruleanVariants.forEach(v => {
          console.log(`  - Color: ${v.color}, Size: ${v.size}, BasePrice (Variant): ${v.basePrice !== undefined ? v.basePrice : 'OVERRIDE NOT SET'} (Catalog Base: ${product.basePrice})`);
        });
      }
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

checkVariants();
