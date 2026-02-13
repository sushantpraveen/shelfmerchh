require('dotenv').config();
const mongoose = require('mongoose');

async function listUsers() {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error('MONGO_URL not found in .env');
      return;
    }
    
    await mongoose.connect(mongoUrl);
    const collection = mongoose.connection.collection('users');
    const users = await collection.find({}).limit(5).toArray();
    
    console.log('Users:');
    users.forEach(u => {
      console.log(`Email: ${u.email}, Role: ${u.role}, Verified: ${u.isEmailVerified}`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

listUsers();
