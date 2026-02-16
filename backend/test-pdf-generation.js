const { generateOrderInvoicePDF } = require('./utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

const mockOrder = {
  _id: '65cb68e1a2d5f1234567890a',
  createdAt: new Date(),
  status: 'paid',
  customerEmail: 'customer@example.com',
  subtotal: 750,
  shipping: 50,
  tax: 60,
  total: 860,
  items: [
    {
      productName: 'Cool T-Shirt',
      price: 400,
      quantity: 1,
      variant: { size: 'L', color: 'Black' }
    },
    {
      productName: 'Premium Hoodie',
      price: 350,
      quantity: 1,
      variant: { size: 'XL', color: 'Navy' }
    }
  ],
  shippingAddress: {
    fullName: 'John Doe',
    addressLine1: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    zipCode: '400001',
    phone: '9876543210'
  }
};

const mockStore = {
  name: 'My Awesome Merch Store',
  slug: 'awesome-merch',
  domain: 'awesome.shelfmerch.in'
};

async function test() {
  try {
    console.log('Starting PDF generation test...');
    const pdfBuffer = await generateOrderInvoicePDF(mockOrder, mockStore);
    
    const outputPath = path.join(__dirname, 'test-invoice.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log(`✓ PDF Invoice generated successfully: ${outputPath}`);
    console.log(`PDF Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('✗ PDF Generation failed:', error);
  }
}

test();
