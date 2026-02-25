const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { runShopifyIndexMigration } = require('./utils/migrations/fixShopifyIndexes');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

// Initialize Express app
const app = express();
app.set('trust proxy', 1); // Trust first proxy (ngrok/nginx) - CRITICAL for secure cookies in dev/prod

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'MONGO_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const variantRoutes = require('./routes/variants');
const variantOptionsRoutes = require('./routes/variantOptions');
const catalogueFieldsRoutes = require('./routes/catalogueFields');
const uploadRoutes = require('./routes/upload');
const assetsRoutes = require('./routes/assets');
const storeRoutes = require('./routes/stores');
const storeBuilderRoutes = require('./routes/storeBuilder');
const storeProductsRoutes = require('./routes/storeProducts');
const storeCheckoutRoutes = require('./routes/storeCheckout');
const storeOrdersRoutes = require('./routes/storeOrders');
const storeCustomerOrdersRoutes = require('./routes/storeCustomerOrders');
const storeCustomersRoutes = require('./routes/storeCustomers');
const shippingQuoteRoutes = require('./routes/shippingQuoteRoutes');
const invoiceRoutes = require('./routes/invoices');
const walletRoutes = require('./routes/wallet');
const adminWalletRoutes = require('./routes/adminWallet');
const razorpayWebhookRoutes = require('./routes/razorpayWebhook');
const merchantWithdrawalsRoutes = require('./routes/merchantWithdrawals');
const adminWithdrawalsRoutes = require('./routes/adminWithdrawals');
const reviewsRoutes = require('./routes/reviews');
const { tenantResolver } = require('./middleware/tenantResolver');
const storeRedirect = require('./middleware/storeRedirect');

const { WHITELISTED_DOMAINS } = require('./utils/security');

// CORS configuration - MUST BE FIRST
// Supports wildcard subdomains for multi-tenant architecture
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const isWhitelisted = WHITELISTED_DOMAINS.some(domain =>
      origin.includes(domain)
    );

    if (isWhitelisted) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Host', 'X-API-Key', 'ngrok-skip-browser-warning'],
  exposedHeaders: ['Authorization'],
  preflightContinue: false
};

// Apply CORS middleware (handles preflight OPTIONS requests automatically)
app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_SECRET || process.env.JWT_SECRET)); 
// Security middleware (after CORS)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      imgSrc: ["'self'", "data:", "https:"],
      frameAncestors: ["'self'", "https://admin.shopify.com", "https://*.myshopify.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false // Required for Shopify embedded apps
}));

// Root route (GET /)
app.get('/', (req, res) => {
  res.status(200).send('ShelfMerch Shopify Backend - Ready');
});


// Express Session Middleware - Required for Passport OAuth state validation
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  proxy: true // Required for secure cookie over HTTPS behind a proxy
}));

// === PUBLIC ROUTES (Bypass Global Auth) ===
// Webhook raw body handlers (MUST be before express.json)
app.use('/api/razorpay', razorpayWebhookRoutes);
app.use('/api/shopify/webhooks', express.raw({ type: 'application/json' }));
// Body parser middleware - Increased limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/shopify', require('./routes/shopifyRoutes'));

// Cron Job for Shopify Sync (Every 2 minutes) — gated by CRON_ENABLED
const cron = require('node-cron');
const { syncForShop } = require('./services/shopifySync');
const ShopifyStore = require('./models/ShopifyStore');

if (process.env.CRON_ENABLED !== 'false') {
  cron.schedule('*/2 * * * *', async () => {
    console.log(`[CRON] Starting Shopify Sync (mode: ${process.env.SYNC_MODE || 'orders'})...`);
    try {
      const stores = await ShopifyStore.find({ isActive: true });
      for (const store of stores) {
        try {
          const result = await syncForShop(store.shop, store.merchantId);
          console.log(`[SYNC] ${store.shop}: Fetched ${result.fetched}, Upserted ${result.upserted} (${result.mode})`);
        } catch (err) {
          console.error(`[SYNC ERROR] ${store.shop}:`, err.message);
        }
      }
    } catch (error) {
      console.error('[CRON ERROR] Failed to load stores', error);
    }
  });
  console.log('[CRON] Shopify sync cron scheduled (every 2 min)');
} else {
  console.log('[CRON] Shopify sync cron DISABLED (CRON_ENABLED=false)');
}


// Passport Config
require('./config/passport')(passport);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Enable subdomain routing by ensuring hostname is available
app.use((req, res, next) => {
  // Ensure hostname is set (important for subdomain extraction)
  if (!req.hostname && req.get('host')) {
    req.hostname = req.get('host').split(':')[0];
  }
  next();
});

// Rate limiting (skip for OPTIONS requests)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 6000, // limit each IP to 1000 requests per windowMs (increased from 100)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' // Skip rate limiting for preflight
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug endpoint for production diagnosis
app.get('/api/_debug/version', (req, res) => {
  res.status(200).json({
    success: true,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    node_version: process.version,
    // Add dummy commit for now, usually this would be injected by CI/CD
    version: '1.0.1-shopify-fix-v3' 
  });
});

// Store redirect middleware (redirects /store/:slug/* to subdomain in production)
// Must be before API routes but after health check
app.use(storeRedirect);

// API Routes
// Store-scoped routes that need tenant resolution
app.use('/api/store-products', tenantResolver, storeProductsRoutes);
app.use('/api/store-checkout', tenantResolver, storeCheckoutRoutes);
app.use('/api/store-orders', tenantResolver, storeOrdersRoutes);
app.use('/api/store-auth', tenantResolver, require('./routes/storeAuth'));
app.use('/api/store-customer/orders', tenantResolver, storeCustomerOrdersRoutes);
app.use('/api/store-customers', tenantResolver, storeCustomersRoutes);
app.use('/api/reviews', tenantResolver, reviewsRoutes);

// Routes that may use tenant but don't require it (legacy support)
app.use('/api/stores', tenantResolver, storeRoutes);
app.use('/api/stores', tenantResolver, storeBuilderRoutes); // Builder routes under /api/stores/:id/builder

// Routes that don't need tenant resolution (admin, auth, catalog)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/variant-options', variantOptionsRoutes);
app.use('/api/catalogue-fields', catalogueFieldsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/placeholders', require('./routes/placeholders'));
app.use('/api/shipping-quote', shippingQuoteRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin/wallet', adminWalletRoutes);
app.use('/api/merchant', merchantWithdrawalsRoutes);
app.use('/api/admin/withdrawals', adminWithdrawalsRoutes);
app.use('/api/admin/shopify-orders', require('./routes/adminShopifyOrders'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message || err);
  if (err.stack && process.env.NODE_ENV === 'development') {
    console.error('Error stack:', err.stack);
  }

  // CORS error
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    const dbName = process.env.DB_NAME;

    if (!mongoUrl) {
      throw new Error('MONGO_URL environment variable is not set');
    }

    const connectionString = dbName
      ? `${mongoUrl}/${dbName}?retryWrites=true&w=majority`
      : `${mongoUrl}?retryWrites=true&w=majority`;

    const conn = await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('Unhandled Promise Rejection:', err);
  console.error('Stack:', err.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    
    // Run one-time migrations
    await runShopifyIndexMigration();

    const server = app.listen(PORT, '0.0.0.0', () => {
      const address = server.address();
      console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
      console.log(`✅ Server listening on: ${JSON.stringify(address)}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        process.exit(1);
      } else {
        console.error('❌ Server error:', error);
        throw error;
      }
    });

    // Increase server timeout for large requests
    server.timeout = 30000;

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed');
          process.exit(0);
        } catch (err) {
          console.error('Error closing MongoDB connection:', err);
          process.exit(1);
        }
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(async () => {
        console.log('HTTP server closed');
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed');
          process.exit(0);
        } catch (err) {
          console.error('Error closing MongoDB connection:', err);
          process.exit(1);
        }
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

