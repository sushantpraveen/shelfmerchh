require('dotenv').config();
const mongoose = require('mongoose');

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to:', mongoose.connection.name);
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`${col.name}: ${count}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
};

checkDB();
