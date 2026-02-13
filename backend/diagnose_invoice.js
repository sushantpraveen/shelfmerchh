const mongoose = require('mongoose');
const StoreOrder = require('./models/StoreOrder');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
const storeCheckout = require('./routes/storeCheckout');
const generateFulfillmentInvoice = storeCheckout.generateFulfillmentInvoice;
console.log('generateFulfillmentInvoice type:', typeof generateFulfillmentInvoice);
require('dotenv').config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const orders = await StoreOrder.find().sort({ createdAt: -1 });
    let missingOrder = null;
    for (const o of orders) {
      const inv = await FulfillmentInvoice.findOne({ orderId: o._id });
      if (!inv) {
        missingOrder = o;
        break;
      }
    }

    if (!missingOrder) {
      console.error('No orders missing invoices found');
      return;
    }
    const order = missingOrder;
    const orderId = order._id;
    console.log(`Diagnosing Missing Order: ${orderId}`);

    console.log('Order data:', JSON.stringify(order, null, 2));

    console.log('\n--- Tracing generateFulfillmentInvoice ---');
    const result = await generateFulfillmentInvoice(order);
    console.log('\n--- End of Trace ---');

    if (result) {
      console.log('✓ Invoice generated successfully during trace:', result.invoiceNumber);
    } else {
      console.log('✗ Invoice generation FAILED during trace.');
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('DIAGNOSIS_ERROR');
    console.error(err.stack || err);
    process.exit(1);
  }
}

diagnose();
