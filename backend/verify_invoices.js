const mongoose = require('mongoose');
const StoreOrder = require('./models/StoreOrder');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
require('dotenv').config();

async function verify() {
  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/shelfmerch');
    console.log('Connected to MongoDB');

    const orders = await StoreOrder.find().sort({ createdAt: -1 });
    console.log(`Checking total ${orders.length} orders...`);

    let missingCount = 0;
    for (const order of orders) {
      const invoice = await FulfillmentInvoice.findOne({ orderId: order._id });
      if (!invoice) {
        console.log(`✗ Order ${order._id} (Number: ${order.orderNumber}, Status: ${order.status}, Method: ${order.payment?.method}) is MISSING an invoice!`);
        missingCount++;
      }
    }
    console.log(`\nVerification complete. Total orders missing invoices: ${missingCount}`);

    mongoose.disconnect();
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
}

verify();
