const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');

/**
 * Generate a high-quality PDF invoice for an order using an HTML template
 * @param {Object} order - The order document
 * @param {Object} store - The store document
 * @returns {Promise<Buffer>} - The generated PDF as a Buffer
 */
const generateOrderInvoicePDF = async (order, store) => {
  try {
    // 1. Prepare data for the template
    const templatePath = path.join(__dirname, '..', 'templates', 'invoice.hbs');
    const templateHtml = fs.readFileSync(templatePath, 'utf-8');

    // Convert logo to base64 for reliable rendering
    let logoBase64 = '';
    const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = logoBuffer.toString('base64');
    }

    const compiledTemplate = handlebars.compile(templateHtml);

    // Format items for the table
    const items = order.items.map(item => ({
      name: item.productName,
      variant: [item.variant?.color, item.variant?.size].filter(Boolean).join(' / ') || '-',
      qty: item.quantity,
      price: item.price.toFixed(2),
      taxRate: 18, // 18% GST (CGST 9% + SGST 9%)
      total: (item.price * item.quantity).toFixed(2)
    }));

    const tax = order.tax || 0;
    const data = {
      companyName: 'ShelfMerch',
      companyAddress: 'Plot No 123, Jubilee Hills, Hyderabad, Telangana - 500033',
      companyEmail: 'billing@shelfmerch.in',
      companyPhone: '+91 99999 88888',
      companyGSTIN: '36AAAAA0000A1Z5', // Mock GSTIN
      logoBase64,
      invoiceNo: order._id.toString().slice(-8).toUpperCase(),
      orderId: order._id.toString().toUpperCase(),
      date: new Date(order.createdAt).toLocaleDateString('en-IN'),
      isPaid: order.status === 'paid',
      paymentStatus: order.status.toUpperCase(),
      customerName: order.shippingAddress?.fullName || 'N/A',
      customerEmail: order.customerEmail || '',
      customerPhone: order.shippingAddress?.phone || '',
      customerAddress: [
        order.shippingAddress?.address1,
        order.shippingAddress?.address2,
        `${order.shippingAddress?.city}, ${order.shippingAddress?.state} - ${order.shippingAddress?.zipCode}`,
        order.shippingAddress?.country
      ].filter(Boolean).join('\n'),
      shipToSame: true, // Assuming same for now
      items,
      subtotal: order.subtotal.toFixed(2),
      shipping: order.shipping.toFixed(2),
      discount: (order.discount || 0).toFixed(2),
      cgst: (tax / 2).toFixed(2),
      sgst: (tax / 2).toFixed(2),
      totalTax: tax.toFixed(2),
      grandTotal: order.total.toFixed(2)
    };

    const html = compiledTemplate(data);

    // 2. Launch Puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport for better rendering
    await page.setViewport({ width: 800, height: 1100 });
    
    // Set content and wait for network idle to ensure fonts/images load
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    await browser.close();
    return pdfBuffer;
  } catch (err) {
    console.error('[pdfGenerator] Error:', err);
    throw err;
  }
};

module.exports = {
  generateOrderInvoicePDF
};
