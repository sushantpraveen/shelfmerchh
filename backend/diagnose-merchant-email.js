require('dotenv').config();
const mongoose = require('mongoose');
const Store = require('./models/Store');
const User = require('./models/User');

const diagnoseTimeAndOrders = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    console.log(`Current Server Time (UTC): ${new Date().toISOString()}`);

    const StoreOrder = require('./models/StoreOrder');
    const orders = await StoreOrder.find().sort({ createdAt: -1 }).limit(2);
    
    if (orders.length === 0) {
      console.log('No orders found in the database.');
      return;
    }

    for (const order of orders) {
      console.log(`\n- Order ID: ${order._id}`);
      console.log(`  CreatedAt: ${order.createdAt.toISOString()}`);
      console.log(`  MerchantId: ${order.merchantId}`);
      
      const merchant = await User.findById(order.merchantId).select('email');
      console.log(`  Merchant Email: ${merchant ? merchant.email : 'Not found'}`);
      
      const store = await Store.findById(order.storeId);
      console.log(`  Store Name: ${store ? store.name : 'Not found'}`);
    }

  } catch (error) {
    console.error('Diagnosis failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

diagnoseTimeAndOrders();
