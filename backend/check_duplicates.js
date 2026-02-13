const mongoose = require('mongoose');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
require('dotenv').config();

async function checkDuplicates() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const invoices = await FulfillmentInvoice.find();
    console.log(`Total Invoices: ${invoices.length}`);

    const orderIdMap = new Map();
    const invNumMap = new Map();
    const duplicates = [];

    for (const inv of invoices) {
      const oid = inv.orderId.toString();
      const inum = inv.invoiceNumber;

      if (orderIdMap.has(oid)) {
        duplicates.push({ type: 'orderId', value: oid, invoices: [orderIdMap.get(oid), inv._id] });
      } else {
        orderIdMap.set(oid, inv._id);
      }

      if (invNumMap.has(inum)) {
        duplicates.push({ type: 'invoiceNumber', value: inum, invoices: [invNumMap.get(inum), inv._id] });
      } else {
        invNumMap.set(inum, inv._id);
      }
    }

    if (duplicates.length > 0) {
      console.log('Duplicates found:');
      console.log(JSON.stringify(duplicates, null, 2));
    } else {
      console.log('No duplicates found in the database.');
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
}

checkDuplicates();
