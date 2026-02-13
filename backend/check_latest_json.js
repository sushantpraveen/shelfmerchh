const mongoose = require('mongoose');
const StoreOrder = require('./models/StoreOrder');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
const fs = require('fs');
require('dotenv').config();

async function checkLatest() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Get last 10 orders
    const orders = await StoreOrder.find().sort({ createdAt: -1 }).limit(10);
    const results = [];

    for (const order of orders) {
      const invoice = await FulfillmentInvoice.findOne({ orderId: order._id });
      results.push({
        orderId: order._id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.status,
        paymentMethod: order.payment?.method,
        hasInvoice: !!invoice,
        invoiceNumber: invoice ? invoice.invoiceNumber : null,
        invoiceStatus: invoice ? invoice.status : null
      });
    }

    fs.writeFileSync('latest_orders.json', JSON.stringify(results, null, 2));
    console.log('Results written to latest_orders.json');

    mongoose.disconnect();
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkLatest();
