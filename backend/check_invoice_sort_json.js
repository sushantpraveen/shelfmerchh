const mongoose = require('mongoose');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
const StoreOrder = require('./models/StoreOrder');
const fs = require('fs');
require('dotenv').config();

async function checkInvoices() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Get last 30 invoices sorted by creation time
    const invoices = await FulfillmentInvoice.find()
      .populate('orderId', 'orderNumber payment.method')
      .sort({ createdAt: -1 })
      .limit(30);

    const results = invoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      createdAt: inv.createdAt,
      orderNumber: inv.orderId?.orderNumber || inv.orderId?._id,
      paymentMethod: inv.orderId?.payment?.method,
      status: inv.status
    }));

    fs.writeFileSync('sorted_invoices.json', JSON.stringify(results, null, 2));
    console.log('Results written to sorted_invoices.json');

    mongoose.disconnect();
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkInvoices();
