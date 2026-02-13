require('dotenv').config();
const mongoose = require('mongoose');

async function listCatalog() {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error('MONGO_URL not found in .env');
      return;
    }
    
    await mongoose.connect(mongoUrl);
    const collection = mongoose.connection.collection('catalogproducts');
    const products = await collection.find({}).limit(5).toArray();
    
    console.log('Catalog Products:');
    products.forEach(p => {
      console.log(`Name: ${p.name}, ID: ${p._id}, isActive: ${p.isActive}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

listCatalog();
