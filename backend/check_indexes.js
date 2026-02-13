require('dotenv').config();
const mongoose = require('mongoose');

async function listIndexes() {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error('MONGO_URL not found in .env');
      return;
    }
    
    await mongoose.connect(mongoUrl);
    const collection = mongoose.connection.collection('storeproducts');
    const indexes = await collection.indexes();
    
    console.log('START_INDEX_LIST');
    console.log(JSON.stringify(indexes, null, 2));
    console.log('END_INDEX_LIST');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

listIndexes();
