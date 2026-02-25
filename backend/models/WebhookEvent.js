const mongoose = require('mongoose');

const WebhookEventSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  topic: {
    type: String,
    required: true,
    index: true
  },
  webhookId: {
    type: String,
    required: false, // Make optional if missing
  },
  dedupeKey: {
    type: String,
    required: true,
    index: true
  },
  orderId: {
    type: String,
    required: false
  },
  status: {
    type: String,
    enum: ['received', 'processed', 'failed', 'ignored'],
    default: 'received'
  },
  attempts: {
    type: Number,
    default: 1
  },
  lastError: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Unique compound index for idempotency per shop + dedupeKey
WebhookEventSchema.index({ shop: 1, dedupeKey: 1 }, { unique: true });

// Optional index for lookups by order
WebhookEventSchema.index({ shop: 1, topic: 1, orderId: 1 });

module.exports = mongoose.model('WebhookEvent', WebhookEventSchema);
