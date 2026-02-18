const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Store = require('../models/Store');
const StoreCustomer = require('../models/StoreCustomer');

const { sendOTP: sendEmailOTP } = require('../utils/mailer');
const { sendOTP: sendPhoneOTP } = require('../utils/msg91');

// Helper to get store by subdomain
const getStoreBySubdomain = async (subdomain) => {
    if (!subdomain) return null;
    return await Store.findOne({ slug: subdomain }).lean();
};

const sendCustomerTokenResponse = (customer, statusCode, res) => {
    const payload = {
        customer: {
            id: customer._id,
            storeId: customer.storeId,
        },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });

    res.status(statusCode).json({
        success: true,
        token,
        customer: {
            id: customer._id,
            name: customer.name,
            email: customer.email,
        },
    });
};

// Middleware to verify Store Customer Token
const verifyStoreToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ success: false, message: 'No auth token found' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.customer = decoded; // { customer: { id, storeId } }
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

// @route   POST /api/store-auth/otp/send
router.post('/otp/send', async (req, res) => {
    try {
        const { subdomain, otpType, email, phoneNumber } = req.body;

        if (!subdomain) {
            return res.status(400).json({ success: false, message: 'Subdomain is required' });
        }

        const store = await getStoreBySubdomain(subdomain);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        let identifier;
        if (otpType === 'email') {
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ success: false, message: 'Valid email is required' });
            }
            identifier = email.toLowerCase().trim();
        } else if (otpType === 'phone') {
            if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.replace(/\D/g, ''))) {
                return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required' });
            }
            identifier = phoneNumber.replace(/\D/g, '').slice(-10);
        } else {
            return res.status(400).json({ success: false, message: 'Invalid OTP type' });
        }

        const query = otpType === 'email'
            ? { storeId: store._id, email: identifier }
            : { storeId: store._id, phoneNumber: identifier };

        let customer = await StoreCustomer.findOne(query);
        const exists = !!customer;

        if (!customer) {
            customer = await StoreCustomer.create({
                storeId: store._id,
                merchantId: store.merchant,
                email: otpType === 'email' ? identifier : undefined,
                phoneNumber: otpType === 'phone' ? identifier : undefined,
                name: otpType === 'email' ? identifier.split('@')[0] : `Customer ${identifier.slice(-4)}`,
            });
        }

        let otp;
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        if (otpType === 'email') {
            otp = Math.floor(100000 + Math.random() * 900000).toString();
            customer.emailVerificationToken = otp;
            customer.emailVerificationTokenExpiry = otpExpiry;
            await customer.save();

            await sendEmailOTP(identifier, otp, customer.name, exists ? 'login' : 'signup');
        } else {
            const result = await sendPhoneOTP(identifier);
            if (!result.success) {
                throw new Error(result.message || 'Failed to send SMS');
            }
            otp = result.otp;
            customer.phoneVerificationToken = otp;
            customer.phoneVerificationTokenExpiry = otpExpiry;
            await customer.save();
        }

        res.status(200).json({
            success: true,
            exists,
            message: `OTP sent to ${otpType}`
        });
    } catch (err) {
        console.error('Store OTP Send Error:', err);
        res.status(500).json({ success: false, message: 'Server error sending OTP' });
    }
});

// @route   POST /api/store-auth/otp/verify
router.post('/otp/verify', async (req, res) => {
    try {
        const { subdomain, otpType, email, phoneNumber, otp } = req.body;

        if (!subdomain || !otp) {
            return res.status(400).json({ success: false, message: 'Subdomain and OTP are required' });
        }

        const store = await getStoreBySubdomain(subdomain);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        let identifier;
        if (otpType === 'email') {
            identifier = email?.toLowerCase().trim();
        } else if (otpType === 'phone') {
            identifier = phoneNumber?.replace(/\D/g, '').slice(-10);
        }

        if (!identifier) {
            return res.status(400).json({ success: false, message: 'Valid identifier required' });
        }

        const query = otpType === 'email'
            ? { storeId: store._id, email: identifier }
            : { storeId: store._id, phoneNumber: identifier };

        const selectFields = otpType === 'email'
            ? '+emailVerificationToken +emailVerificationTokenExpiry'
            : '+phoneVerificationToken +phoneVerificationTokenExpiry';

        const customer = await StoreCustomer.findOne(query).select(selectFields);

        if (!customer) {
            return res.status(400).json({ success: false, message: 'Customer not found' });
        }

        let isValid = false;
        if (otpType === 'email') {
            isValid = customer.emailVerificationToken === otp && customer.emailVerificationTokenExpiry > Date.now();
        } else {
            isValid = customer.phoneVerificationToken === otp && customer.phoneVerificationTokenExpiry > Date.now();
        }

        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        if (otpType === 'email') {
            customer.isEmailVerified = true;
            customer.emailVerificationToken = undefined;
            customer.emailVerificationTokenExpiry = undefined;
        } else {
            customer.isPhoneVerified = true;
            customer.phoneVerificationToken = undefined;
            customer.phoneVerificationTokenExpiry = undefined;
        }

        customer.lastSeenAt = new Date();
        await customer.save();

        sendCustomerTokenResponse(customer, 200, res);
    } catch (err) {
        console.error('Store OTP Verify Error:', err);
        res.status(500).json({ success: false, message: 'Server error verifying OTP' });
    }
});

// @route   POST /api/store-auth/signup/complete
router.post('/signup/complete', verifyStoreToken, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: 'Name is required' });
        }

        const customer = await StoreCustomer.findById(req.customer.customer.id);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        customer.name = name.trim();
        await customer.save();

        res.json({
            success: true,
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
            }
        });
    } catch (err) {
        console.error('Store Signup Complete Error:', err);
        res.status(500).json({ success: false, message: 'Server error completing signup' });
    }
});

// POST /api/store-auth/register
router.post('/register', async (req, res) => {
    try {
        const { subdomain, name, email, password } = req.body;

        if (!subdomain || !email || !password || !name) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const store = await getStoreBySubdomain(subdomain);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        // Check if customer exists in this store
        let customer = await StoreCustomer.findOne({ storeId: store._id, email });
        if (customer) {
            return res.status(400).json({ success: false, message: 'Customer already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create customer
        customer = await StoreCustomer.create({
            storeId: store._id,
            merchantId: store.merchant,
            name,
            email,
            passwordHash,
            marketingOptIn: req.body.marketingOptIn || false,
            lastSeenAt: new Date(),
        });

        sendCustomerTokenResponse(customer, 201, res);
    } catch (err) {
        console.error('Store Register Error:', err);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// POST /api/store-auth/login
router.post('/login', async (req, res) => {
    try {
        const { subdomain, email, password } = req.body;

        if (!subdomain || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const store = await getStoreBySubdomain(subdomain);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        // Find customer
        const customer = await StoreCustomer.findOne({ storeId: store._id, email });
        if (!customer) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password
        if (!customer.passwordHash) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, customer.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Update last seen
        customer.lastSeenAt = new Date();
        await customer.save();

        sendCustomerTokenResponse(customer, 200, res);
    } catch (err) {
        console.error('Store Login Error:', err);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// GET /api/store-auth/me
router.get('/me', verifyStoreToken, async (req, res) => {
    try {
        const customer = await StoreCustomer.findById(req.customer.customer.id).select('-passwordHash');
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.json({ success: true, customer });
    } catch (err) {
        console.error('Store Me Error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT /api/store-auth/me
router.put('/me', verifyStoreToken, async (req, res) => {
    try {
        const customerId = req.customer.customer.id;
        const { name, marketingOptIn, phoneNumber } = req.body || {};

        const updates = {};
        if (typeof name === 'string' && name.trim().length > 0) {
            updates.name = name.trim();
        }
        if (typeof marketingOptIn === 'boolean') {
            updates.marketingOptIn = marketingOptIn;
            updates['notificationPreferences.marketingEmails'] = marketingOptIn;
        }
        if (typeof phoneNumber === 'string') {
            const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
            if (cleanPhone.length === 10) {
                // If phone number changes, reset verification
                const current = await StoreCustomer.findById(customerId);
                if (current.phoneNumber !== cleanPhone) {
                    updates.phoneNumber = cleanPhone;
                    updates.isPhoneVerified = false;
                }
            }
        }

        const customer = await StoreCustomer.findByIdAndUpdate(
            customerId,
            { $set: updates },
            { new: true, runValidators: true, select: '-passwordHash' }
        );

        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }

        res.json({ success: true, customer });
    } catch (err) {
        console.error('Store Update Me Error:', err);
        res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
});

// GET /api/store-auth/verification-status
router.get('/verification-status', verifyStoreToken, async (req, res) => {
    try {
        const customer = await StoreCustomer.findById(req.customer.customer.id).select('isEmailVerified isPhoneVerified phoneNumber email');
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found' });
        }
        res.json({
            success: true,
            isEmailVerified: customer.isEmailVerified,
            isPhoneVerified: customer.isPhoneVerified,
            hasPhone: !!customer.phoneNumber,
            hasEmail: !!customer.email
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ADDRESSES
// GET /api/store-auth/addresses
router.get('/addresses', verifyStoreToken, async (req, res) => {
    try {
        const customer = await StoreCustomer.findById(req.customer.customer.id).select('addresses');
        res.json({ success: true, data: customer.addresses || [] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST /api/store-auth/addresses
router.post('/addresses', verifyStoreToken, async (req, res) => {
    try {
        const { fullName, address1, address2, city, state, zipCode, country, phone, isDefault } = req.body;
        const customer = await StoreCustomer.findById(req.customer.customer.id);

        const newAddress = { fullName, address1, address2, city, state, zipCode, country, phone, isDefault };

        if (isDefault || customer.addresses.length === 0) {
            newAddress.isDefault = true;
            customer.addresses.forEach(a => a.isDefault = false);
        }

        customer.addresses.push(newAddress);
        await customer.save();

        res.json({ success: true, data: customer.addresses[customer.addresses.length - 1] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT /api/store-auth/addresses/:addressId
router.put('/addresses/:addressId', verifyStoreToken, async (req, res) => {
    try {
        const customer = await StoreCustomer.findById(req.customer.customer.id);
        const address = customer.addresses.id(req.params.addressId);

        if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

        Object.assign(address, req.body);

        if (req.body.isDefault) {
            customer.addresses.forEach(a => {
                if (a._id.toString() !== req.params.addressId) a.isDefault = false;
            });
        }

        await customer.save();
        res.json({ success: true, data: address });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/store-auth/addresses/:addressId
router.delete('/addresses/:addressId', verifyStoreToken, async (req, res) => {
    try {
        const customer = await StoreCustomer.findById(req.customer.customer.id);
        const address = customer.addresses.id(req.params.addressId);
        if (!address) return res.status(404).json({ success: false, message: 'Address not found' });

        const wasDefault = address.isDefault;
        address.remove();

        if (wasDefault && customer.addresses.length > 0) {
            customer.addresses[0].isDefault = true;
        }

        await customer.save();
        res.json({ success: true, message: 'Address deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// VERIFICATION
// POST /api/store-auth/verify-phone/send
router.post('/verify-phone/send', verifyStoreToken, async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber.replace(/\D/g, ''))) {
            return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required' });
        }
        const identifier = phoneNumber.replace(/\D/g, '').slice(-10);

        const existing = await StoreCustomer.findOne({
            storeId: req.customer.customer.storeId,
            phoneNumber: identifier,
            _id: { $ne: req.customer.customer.id }
        });
        if (existing) {
            return res.status(400).json({ success: false, message: 'This phone number is already linked to another account' });
        }

        const customer = await StoreCustomer.findById(req.customer.customer.id);
        const result = await sendPhoneOTP(identifier);
        if (!result.success) throw new Error(result.message);

        customer.phoneVerificationToken = result.otp;
        customer.phoneVerificationTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
        customer.phoneNumber = identifier;
        await customer.save();

        res.json({ success: true, message: 'OTP sent to your phone' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error sending OTP' || err.message });
    }
});

// POST /api/store-auth/verify-phone/confirm
router.post('/verify-phone/confirm', verifyStoreToken, async (req, res) => {
    try {
        const { otp } = req.body;
        const customer = await StoreCustomer.findById(req.customer.customer.id).select('+phoneVerificationToken +phoneVerificationTokenExpiry');

        if (customer.phoneVerificationToken === otp && customer.phoneVerificationTokenExpiry > Date.now()) {
            customer.isPhoneVerified = true;
            customer.phoneVerificationToken = undefined;
            customer.phoneVerificationTokenExpiry = undefined;
            await customer.save();
            res.json({ success: true, message: 'Phone verified successfully', customer });
        } else {
            res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error verifying phone' });
    }
});

// PATCH /api/store-auth/notifications
router.patch('/notifications', verifyStoreToken, async (req, res) => {
    try {
        const { orderUpdates, marketingEmails } = req.body;
        const customer = await StoreCustomer.findById(req.customer.customer.id);

        if (typeof orderUpdates === 'boolean') customer.notificationPreferences.orderUpdates = orderUpdates;
        if (typeof marketingEmails === 'boolean') customer.notificationPreferences.marketingEmails = marketingEmails;

        await customer.save();
        res.json({ success: true, data: customer.notificationPreferences });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// DELETE /api/store-auth/account
router.delete('/account', verifyStoreToken, async (req, res) => {
    try {
        await StoreCustomer.findByIdAndDelete(req.customer.customer.id);
        res.json({ success: true, message: 'Account deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
