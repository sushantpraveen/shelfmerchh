require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createTester() {
  try {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      console.error('MONGO_URL not found in .env');
      return;
    }
    
    await mongoose.connect(mongoUrl);
    const collection = mongoose.connection.collection('users');
    const storesCollection = mongoose.connection.collection('stores');
    
    const email = 'tester@shelfmerch.com';
    const password = 'Password@123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Check if exists
    const existing = await collection.findOne({ email });
    let userId;
    if (existing) {
      console.log('User already exists, updating password and verifying...');
      await collection.updateOne(
        { _id: existing._id },
        { $set: { password: hashedPassword, isEmailVerified: true, isActive: true, role: 'merchant' } }
      );
      userId = existing._id;
    } else {
      const result = await collection.insertOne({
        name: 'Tester User',
        email,
        password: hashedPassword,
        role: 'merchant',
        isEmailVerified: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      userId = result.insertedId;
      console.log('Tester user created.');
    }
    
    // Ensure user has a store
    const existingStore = await storesCollection.findOne({ merchant: userId });
    if (!existingStore) {
      await storesCollection.insertOne({
        name: 'Tester Store',
        slug: 'tester-store',
        merchant: userId,
        type: 'native',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('Tester store created.');
    } else {
      console.log('Tester store already exists.');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

createTester();
