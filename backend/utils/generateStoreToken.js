const jwt = require('jsonwebtoken');

// Generate JWT Token for Store Users
const generateStoreToken = (id) => {
    if (!process.env.JWT_STORE_SECRET) {
        throw new Error('JWT_STORE_SECRET is not configured. Please set it in your .env file.');
    }
    return jwt.sign({ id }, process.env.JWT_STORE_SECRET, {
        expiresIn: '30d' // 30 days for customers
    });
};

// Generate Refresh Token for Store Users
const generateStoreRefreshToken = (id) => {
    if (!process.env.JWT_STORE_REFRESH_SECRET) {
        throw new Error('JWT_STORE_REFRESH_SECRET is not configured. Please set it in your .env file.');
    }
    return jwt.sign({ id }, process.env.JWT_STORE_REFRESH_SECRET, {
        expiresIn: '60d'
    });
};

// Send token response for Store Users
const sendStoreTokenResponse = async (user, statusCode, res) => {
    try {
        const userId = user._id.toString();

        // Create token
        const token = generateStoreToken(userId);
        const refreshToken = generateStoreRefreshToken(userId);

        // Save refresh token to database if supported by model,
        // otherwise just send it. Our StoreUser model doesn't have it yet, let's add it if needed.
        // For now we'll skip saving to DB to keep it simple, or we can add it to schema.

        // Update last login
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        res
            .status(statusCode)
            .json({
                success: true,
                token,
                refreshToken,
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    phone: user.phoneNumber, // For compatibility
                    isEmailVerified: user.isEmailVerified,
                    isPhoneVerified: user.isPhoneVerified,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin,
                }
            });
    } catch (error) {
        console.error('Error in sendStoreTokenResponse:', error);
        res.status(500).json({ success: false, message: 'Token generation error' });
    }
};

module.exports = {
    generateStoreToken,
    generateStoreRefreshToken,
    sendStoreTokenResponse
};
