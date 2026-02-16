const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: function () {
      // Password is required only if user is not using OAuth and not an OTP-only user
      return !this.googleId && !this.phone && !this.isOtpUser;
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allow multiple null values
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['superadmin', 'merchant', 'staff'],
    default: 'merchant',
    required: true
  },
  // For staff: which stores they can access
  assignedStores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  }],
  // For staff: permissions (optional, can be expanded)
  permissions: {
    canManageProducts: { type: Boolean, default: false },
    canManageOrders: { type: Boolean, default: false },
    canViewAnalytics: { type: Boolean, default: false }
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
    select: false
  },
  emailVerificationTokenExpiry: {
    type: Date,
    select: false
  },
  phoneVerificationToken: {
    type: String,
    select: false
  },
  phoneVerificationTokenExpiry: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  lastLogin: {
    type: Date
  },
  isOtpUser: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  upiId: {
    type: String,
    trim: true,
    maxlength: [100, 'UPI ID cannot be more than 100 characters']
  }
}, {
  timestamps: true
});

// Store per-user preview images per product: { [productId]: { [viewKey]: url } }
userSchema.add({
  previewImagesByProduct: {
    type: Map,
    of: Object,
    default: {}
  }
});

// Hash password before saving (only if password is provided and modified)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.emailVerificationToken;
  delete userObject.phoneVerificationToken;
  delete userObject.passwordResetToken;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);


