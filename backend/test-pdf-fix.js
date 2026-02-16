const { generateOrderInvoicePDF } = require('./utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

const mockOrder = {
  _id: '6992D1E78821DD6F',
  createdAt: new Date(),
  status: 'paid',
  customerEmail: 'rizwan_bhai11@gmail.com',
  subtotal: 800.00,
  shipping: 38.90,
  tax: 64.00,
  total: 902.90,
  items: [
    {
      productName: 'tshirt summer cool',
      price: 800.00,
      quantity: 1,
      variant: { size: 'L' }
    }
  ],
  shippingAddress: {
    fullName: 'Rizwan Bhai',
    address1: 'Plot No 123, Jubilee Hills',
    address2: 'Near Metro Station',
    city: 'Hyderabad',
    state: 'Telangana',
    zipCode: '500081',
    phone: '9693814615'
  }
};

const mockStore = {
  name: 'Amazon',
  slug: 'amazon',
  domain: 'amazon.shelfmerch.in'
};

async function test() {
  try {
    console.log('Starting PDF generation verification test...');
    const pdfBuffer = await generateOrderInvoicePDF(mockOrder, mockStore);
    
    const outputPath = path.join(__dirname, 'verified-invoice.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log(`✓ Verified PDF Invoice generated successfully: ${outputPath}`);
    console.log(`PDF Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('✗ PDF Generation failed:', error);
  }
}

test();
