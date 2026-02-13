require('dotenv').config();
const mongoose = require('mongoose');
const { sendMerchantOrderNotification } = require('./utils/mailer');

const testMerchantEmail = async () => {
  console.log('Testing merchant order notification email...');
  
  const merchantEmail = process.env.EMAIL_USER; // Send to self for testing
  const storeName = "Test Store";
  
  const mockOrder = {
    _id: new mongoose.Types.ObjectId(),
    customerEmail: "customer@example.com",
    shippingAddress: {
      fullName: "John Doe"
    },
    payment: {
      method: "razorpay"
    },
    items: [
      {
        productName: "Premium T-Shirt",
        quantity: 2,
        price: 800,
        variant: {
          color: "Black",
          size: "XL"
        }
      },
      {
        productName: "Canvas Tote Bag",
        quantity: 1,
        price: 350,
        variant: {
          color: "Natural"
        }
      }
    ],
    subtotal: 1950,
    shipping: 100,
    tax: 156,
    total: 2206,
    status: "paid"
  };

  try {
    const info = await sendMerchantOrderNotification(merchantEmail, mockOrder, storeName);
    if (info) {
      console.log('✅ Merchant email sent successfully!');
      console.log('Message ID:', info.messageId);
    } else {
      console.log('❌ Email failed to send (but returned null instead of throwing).');
    }
  } catch (error) {
    console.error('❌ Error in test script:');
    console.error(error);
  }
};

testMerchantEmail();
