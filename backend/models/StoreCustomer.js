const mongoose = require('mongoose');

const StoreCustomerSchema = new mongoose.Schema(
  {
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    email: {
      type: String,
      index: true,
    },
    phoneNumber: {
      type: String,
      index: true,
    },
    name: {
      type: String,
    },
    passwordHash: {
      type: String,
    },
    googleId: {
      type: String,
      sparse: true, // Allow multiple null values
    },
    avatar: {
      type: String,
    },
    lastSeenAt: {
      type: Date,
    },
    marketingOptIn: {
      type: Boolean,
      default: false,
    },
    addresses: [
      {
        fullName: String,
        address1: String,
        address2: String,
        city: String,
        state: String,
        zipCode: String,
        country: { type: String, default: 'India' },
        phone: String,
        isDefault: { type: Boolean, default: false },
        label: String, // Home, Office, etc.
      }
    ],
    notificationPreferences: {
      orderUpdates: { type: Boolean, default: true },
      marketingEmails: { type: Boolean, default: false },
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationTokenExpiry: {
      type: Date,
      select: false,
    },
    phoneVerificationToken: {
      type: String,
      select: false,
    },
    phoneVerificationTokenExpiry: {
      type: Date,
      select: false,
    },
    passwordResetOTP: {
      type: String,
      select: false, // Don't include in queries by default
    },
    passwordResetOTPExpiry: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

StoreCustomerSchema.index({ storeId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('StoreCustomer', StoreCustomerSchema);
