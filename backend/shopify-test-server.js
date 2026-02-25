const express = require('express');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = 5000;

// Simple in-memory set to handle idempotency (prevents duplicate processing)
const processedOrders = new Set();

// Middleware to bypass ngrok warning for all responses
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Shopify Test Server is running',
    timestamp: new Date().toISOString()
  });
});

/**
 * FASTEST SHOPIFY WEBHOOK RECEIVER
 * 
 * Instructions:
 * 1. npm init -y
 * 2. npm i express dotenv
 * 3. Set SHOPIFY_WEBHOOK_SECRET in your .env
 * 4. Run: node shopify-test-server.js
 */

// Route to receive webhooks
// IMPORTANT: We use express.raw to get the body precisely as Shopify sent it for HMAC verification
app.post(
  '/api/shopify/webhooks/orders-create',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const hmacHeader = req.get('x-shopify-hmac-sha256');
    const topic = req.get('x-shopify-topic');
    const shop = req.get('x-shopify-shop-domain');
    const rawBody = req.body.toString('utf8');

    console.log(`\n[Test Server] 📥 Received: ${topic} from ${shop}`);
    console.log(`[Test Server] HMAC Present: ${!!hmacHeader}`);

    // 1. Signature Verification
    // IMPORTANT: Ensure SHOPIFY_WEBHOOK_SECRET in .env matches your App Client Secret
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('❌ Error: SHOPIFY_WEBHOOK_SECRET is not set in .env');
      return res.status(500).send('Secret missing');
    }

    const hash = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('base64');

    // Robust comparison
    const hashBuffer = Buffer.from(hash);
    const headerBuffer = Buffer.from(hmacHeader || '');

    if (hashBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(hashBuffer, headerBuffer)) {
      console.warn(`[Test Server] ⚠️ Invalid signature from ${shop}`);
      return res.status(401).send('Invalid HMAC');
    }

    // 2. Parse Payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      return res.status(400).send('Invalid JSON');
    }

    const orderId = payload.id;
    const idempotencyKey = `${shop}:${orderId}`;

    // 3. Idempotency Check
    if (processedOrders.has(idempotencyKey)) {
      console.log(`[Test Server] ⏩ Order ${orderId} already processed. Skipping.`);
      return res.status(200).send('Already processed');
    }

    // 4. Record as processed
    processedOrders.add(idempotencyKey);

    // 5. SUCCESS LOGGING
    console.log('\n=============================================');
    console.log('✅ NEW Shopify Order Received (Verified)');
    console.log('=============================================');
    console.log(`Order ID    : ${payload.id}`);
    console.log(`Order Name  : ${payload.name}`);
    console.log(`Total Price : ${payload.total_price} ${payload.currency}`);
    console.log(`Customer    : ${payload.customer?.email || 'N/A'}`);
    console.log(`Phone       : ${payload.shipping_address?.phone || 'N/A'}`);
    console.log(`Address     : ${payload.shipping_address?.address1}, ${payload.shipping_address?.city}, ${payload.shipping_address?.country}`);
    
    console.log('\nLine Items:');
    payload.line_items.forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.sku}] ${item.title} x${item.quantity} - ${item.price}`);
    });
    console.log('=============================================\n');

    // Respond 200 OK to Shopify as fast as possible
    res.status(200).send('Order Received');
  }
);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Standalone Shopify Webhook Receiver running on port ${PORT}`);
  console.log(`📍 Endpoint: http://localhost:${PORT}/api/shopify/webhooks/orders-create`);
});
