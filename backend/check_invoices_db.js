require('dotenv').config();
const mongoose = require('mongoose');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');

async function checkInvoices() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    const count = await FulfillmentInvoice.countDocuments();
    console.log(`Total invoices: ${count}`);
    if (count > 0) {
      const latest = await FulfillmentInvoice.findOne().sort({ createdAt: -1 });
      console.log('Latest invoice details:', JSON.stringify(latest, null, 2));
    }
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error checking invoices:', error);
  }
}

checkInvoices();
