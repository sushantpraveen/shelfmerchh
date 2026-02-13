const mongoose = require('mongoose');
const StoreOrder = require('./models/StoreOrder');
const FulfillmentInvoice = require('./models/FulfillmentInvoice');
const Store = require('./models/Store');
const StoreCustomer = require('./models/StoreCustomer');
const CatalogProduct = require('./models/CatalogProduct');
const StoreProduct = require('./models/StoreProduct');
require('dotenv').config();

// We need to simulate the generateFulfillmentInvoice function or call the route
// Since we can't easily call the route (requires token), we'll import the logic
// or just call the function directly if we can.
// But for simplicity, I'll just check if the code in storeCheckout.js would work.

const storeCheckout = require('./routes/storeCheckout');
const generateFulfillmentInvoice = storeCheckout.generateFulfillmentInvoice;

async function testFix() {
  try {
    await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/shelfmerch');
    console.log('Connected to MongoDB');

    // 1. Find a store and a customer
    const store = await Store.findOne({ isActive: true });
    const customer = await StoreCustomer.findOne({ storeId: store._id });
    const storeProduct = await StoreProduct.findOne({ storeId: store._id });

    if (!store || !customer || !storeProduct) {
      console.error('Could not find test data');
      return;
    }

    console.log(`Using Store: ${store.slug}, Customer: ${customer.email}, Product: ${storeProduct.title}`);

    // 2. Create a dummy order mimicking the direct checkout route
    const orderData = {
      merchantId: store.merchant,
      storeId: store._id,
      customerId: customer._id,
      customerEmail: customer.email,
      items: [{
        storeProductId: storeProduct._id,
        productName: storeProduct.title,
        quantity: 1,
        price: storeProduct.sellingPrice || 1000,
        variant: { color: 'Black', size: 'L' }
      }],
      subtotal: storeProduct.sellingPrice || 1000,
      shipping: 5.99,
      tax: (storeProduct.sellingPrice || 1000) * 0.08,
      total: (storeProduct.sellingPrice || 1000) * 1.08 + 5.99,
      shippingAddress: {
        fullName: 'Test User',
        email: 'test@example.com',
        phone: '1234567890',
        address1: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '123456',
        country: 'India'
      },
      payment: { method: 'cod' }
    };

    console.log('Creating dummy order...');
    const order = await StoreOrder.create(orderData);
    console.log(`Order created: ${order._id}`);

    // 3. Manually call generateFulfillmentInvoice (this is what the route now does)
    console.log('Triggering invoice generation...');
    const invoice = await generateFulfillmentInvoice(order);

    if (invoice) {
        console.log(`✓ Invoice generated: ${invoice.invoiceNumber}`);
        console.log(`  Status: ${invoice.status}`);
        console.log(`  Payment Method: ${invoice.paymentDetails.method}`);
        
        // Cleanup test data
        // await StoreOrder.deleteOne({ _id: order._id });
        // await FulfillmentInvoice.deleteOne({ _id: invoice._id });
        // console.log('Test data cleaned up.');
    } else {
        console.log('✗ Invoice generation FAILED!');
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('ERROR_START');
    console.error(err);
    console.error('ERROR_END');
    process.exit(1);
  }
}

testFix();
