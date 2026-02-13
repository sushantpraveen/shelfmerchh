const mongoose = require('mongoose');
const StoreOrder = require('./models/StoreOrder');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
const storeCheckout = require('./routes/storeCheckout');
const generateFulfillmentInvoice = storeCheckout.generateFulfillmentInvoice;
require('dotenv').config();

async function backfill() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    const orders = await StoreOrder.find().sort({ createdAt: 1 }); // Oldest first
    console.log(`Checking total ${orders.length} orders...`);

    let count = 0;
    for (const order of orders) {
      const inv = await FulfillmentInvoice.findOne({ orderId: order._id });
      if (!inv) {
        console.log(`Generating invoice for order ${order._id} (${order.orderNumber})...`);
        try {
          const newInv = await generateFulfillmentInvoice(order);
          if (newInv) {
            console.log(`  ✓ Created ${newInv.invoiceNumber}`);
            count++;
          } else {
            console.log(`  ✗ Failed to create invoice (check logs)`);
          }
        } catch (e) {
          console.error(`  ✗ Error: ${e.message}`);
        }
      }
    }

    console.log(`\nBackfill complete. Created ${count} missing invoices.`);
    mongoose.disconnect();
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
}

backfill();
