const { generateOrderInvoicePDF } = require('./utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

const mockOrder = {
  _id: '65cb68e1a2d5f1234567890a',
  createdAt: new Date(),
  status: 'paid',
  customerEmail: 'customer@example.com',
  subtotal: 1500,
  shipping: 100,
  tax: 270,
  total: 1870,
  discount: 0,
  items: [
    {
      productName: 'Custom Printed T-Shirt',
      price: 800,
      quantity: 1,
      variant: { size: 'L', color: 'Black' }
    },
    {
      productName: 'ShelfMerch Premium Hoodie',
      price: 700,
      quantity: 1,
      variant: { size: 'XL', color: 'Navy' }
    }
  ],
  shippingAddress: {
    fullName: 'Jane Smith',
    address1: '456 Tech Park',
    address2: 'Suite 101',
    city: 'Bangalore',
    state: 'Karnataka',
    zipCode: '560001',
    country: 'India',
    phone: '+91 98765 43210'
  }
};

const mockStore = {
  name: 'ShelfMerch Official',
  slug: 'shelfmerch',
  domain: 'shop.shelfmerch.in'
};

async function test() {
  try {
    console.log('Starting Modern Invoice PDF generation test...');
    const pdfBuffer = await generateOrderInvoicePDF(mockOrder, mockStore);
    
    const outputPath = path.join(__dirname, 'modern-invoice.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log(`✓ Modern PDF Invoice generated successfully: ${outputPath}`);
    console.log(`PDF Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('✗ Modern PDF Generation failed:', error);
  }
}

test();
