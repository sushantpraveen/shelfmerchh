const mongoose = require('mongoose');

const StoreUserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            lowercase: true,
            trim: true,
            unique: true,
            sparse: true,
        },
        phoneNumber: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
        },
        name: {
            type: String,
            trim: true,
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isPhoneVerified: {
            type: Boolean,
            default: false,
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
        lastLogin: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        addresses: [
            {
                fullName: String,
                address1: String,
                address2: String,
                city: String,
                state: String,
                zipCode: String,
                country: String,
                phone: String,
                isDefault: { type: Boolean, default: false },
                label: String,
            },
        ],
    },
    {
        timestamps: true,
        collection: 'store_users', // As requested: Separate user collection
    }
);

// We want uniqueness across email and phone, but they can be null initially in some flows
// For simplicity, we'll handle uniqueness at the controller level or use sparse unique indexes if needed
// StoreUserSchema.index({ email: 1 }, { unique: true, sparse: true });
// StoreUserSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('StoreUser', StoreUserSchema);
