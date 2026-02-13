const mongoose = require('mongoose');
const StoreOrder = require('./models/StoreOrder');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
require('dotenv').config();

async function checkLatest() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Get last 5 orders
    const orders = await StoreOrder.find().sort({ createdAt: -1 }).limit(5);

    console.log('\n--- Latest 5 Orders ---');
    for (const order of orders) {
      const invoice = await FulfillmentInvoice.findOne({ orderId: order._id });
      console.log(`Order: ${order.orderNumber || order._id}`);
      console.log(`  Created: ${order.createdAt}`);
      console.log(`  Status: ${order.status}`);
      console.log(`  Payment: ${order.payment?.method}`);
      if (invoice) {
        console.log(`  Invoice: ${invoice.invoiceNumber}`);
        console.log(`  Inv Status: ${invoice.status}`);
        console.log(`  Inv Created: ${invoice.createdAt}`);
      } else {
        console.log(`  [MISSING INVOICE]`);
      }
      console.log('---------------------------');
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkLatest();
