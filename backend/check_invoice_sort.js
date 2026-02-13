const mongoose = require('mongoose');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
const StoreOrder = require('./models/StoreOrder');
require('dotenv').config();

async function checkInvoices() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Get last 30 invoices sorted by creation time (as the UI does)
    const invoices = await FulfillmentInvoice.find()
      .populate('orderId', 'orderNumber payment.method')
      .sort({ createdAt: -1 })
      .limit(30);

    console.log('\n--- Top 30 Invoices (Newest First) ---');
    console.log('Inv# | Created At | Order# | Order Payment');
    for (const inv of invoices) {
      console.log(`${inv.invoiceNumber} | ${inv.createdAt.toISOString()} | ${inv.orderId?.orderNumber || inv.orderId?._id} | ${inv.orderId?.payment?.method}`);
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkInvoices();
