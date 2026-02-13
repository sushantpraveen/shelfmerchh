const mongoose = require('mongoose');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
const StoreOrder = require('./models/StoreOrder');
require('dotenv').config();

async function verifySort() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Simulate backend response with populated fields
    const invoices = await FulfillmentInvoice.find({})
      .populate('orderId', 'orderNumber status createdAt')
      .lean();

    console.log(`Fetched ${invoices.length} invoices.`);

    // Simulate frontend sorting
    const sortedInvoices = invoices.sort((a, b) => {
      const dateA = new Date(a.orderId?.createdAt || a.createdAt).getTime();
      const dateB = new Date(b.orderId?.createdAt || b.createdAt).getTime();
      return dateB - dateA; // Newest first
    });

    const fs = require('fs');
    console.log('\n--- Top 10 Invoices (Sorted by Order Date) ---');
    
    const results = sortedInvoices.slice(0, 10).map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      orderDate: inv.orderId?.createdAt ? new Date(inv.orderId.createdAt).toISOString() : 'N/A',
      invCreatedDate: new Date(inv.createdAt).toISOString(),
      orderNumber: inv.orderId?.orderNumber || 'N/A'
    }));
    
    fs.writeFileSync('sorted_verify.json', JSON.stringify(results, null, 2));
    console.log('Results written to sorted_verify.json');

    mongoose.disconnect();
  } catch (err) {
    console.error('Verify failed:', err);
    process.exit(1);
  }
}

verifySort();
