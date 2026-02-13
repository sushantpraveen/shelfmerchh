const axios = require('axios');

/**
 * MSG91 OTP Service Utility
 * Handles sending and verifying OTPs via MSG91 API
 */

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;
const MSG91_OTP_TEMPLATE_ID = process.env.MSG91_OTP_TEMPLATE_ID;

/**
 * Send OTP to a mobile number using MSG91
 * @param {string} phone - Mobile number (10 digits for India)
 * @returns {Promise<{success: boolean, message: string, otp?: string, type?: string}>}
 */
const sendOTP = async (phone) => {
    try {
        // Validate phone number format (Indian mobile: 10 digits)
        if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
            return {
                success: false,
                message: 'Invalid phone number. Please enter a valid 10-digit Indian mobile number.',
            };
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // MSG91 Flow API endpoint (more reliable than auto-OTP)
        const url = `https://control.msg91.com/api/v5/flow/`;

        const payload = {
            flow_id: MSG91_OTP_TEMPLATE_ID,
            sender: MSG91_SENDER_ID,
            short_url: '1',
            recipients: [
                {
                    mobiles: `91${phone}`,
                    otp: otp,
                    VAR1: otp,
                    var1: otp,
                }
            ]
        };

        console.log('Sending OTP to:', phone);
        console.log('Generated OTP:', otp); // For debugging - remove in production
        console.log('MSG91 Payload:', JSON.stringify(payload, null, 2)); // Debug payload

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
                'authkey': MSG91_AUTH_KEY,
            },
        });

        console.log('MSG91 Send OTP Response:', response.data);

        if (response.data && (response.data.type === 'success' || response.status === 200)) {
            return {
                success: true,
                message: 'OTP sent successfully',
                otp: otp, // Return OTP for storage
                type: 'success',
            };
        } else {
            return {
                success: false,
                message: response.data?.message || 'Failed to send OTP',
            };
        }
    } catch (error) {
        console.error('MSG91 Send OTP Error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Failed to send OTP. Please try again.',
        };
    }
};

/**
 * Verify OTP entered by user using MSG91
 * @param {string} phone - Mobile number (10 digits for India)
 * @param {string} otp - OTP entered by user
 * @returns {Promise<{success: boolean, message: string, type?: string}>}
 */
const verifyOTP = async (phone, otp) => {
    try {
        // Validate inputs
        if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
            return {
                success: false,
                message: 'Invalid phone number',
            };
        }

        if (!otp || !/^\d{4,6}$/.test(otp)) {
            return {
                success: false,
                message: 'Invalid OTP format',
            };
        }

        // MSG91 OTP Verify API endpoint
        const url = `https://control.msg91.com/api/v5/otp/verify`;

        const payload = {
            authkey: MSG91_AUTH_KEY,
            mobile: `91${phone}`, // Add country code for India
            otp: otp,
        };

        console.log('Verifying OTP for:', phone);

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('MSG91 Verify OTP Response:', response.data);

        if (response.data && response.data.type === 'success') {
            return {
                success: true,
                message: 'OTP verified successfully',
                type: response.data.type,
            };
        } else {
            return {
                success: false,
                message: response.data?.message || 'Invalid OTP',
            };
        }
    } catch (error) {
        console.error('MSG91 Verify OTP Error:', error.response?.data || error.message);

        // Check for specific error messages
        if (error.response?.data?.message) {
            return {
                success: false,
                message: error.response.data.message,
            };
        }

        return {
            success: false,
            message: 'Invalid or expired OTP. Please try again.',
        };
    }
};

/**
 * Resend OTP to a mobile number
 * @param {string} phone - Mobile number (10 digits for India)
 * @param {string} retryType - Type of retry ('voice' or 'text')
 * @returns {Promise<{success: boolean, message: string}>}
 */
const resendOTP = async (phone, retryType = 'text') => {
    try {
        const url = `https://control.msg91.com/api/v5/otp/retry`;

        const payload = {
            authkey: MSG91_AUTH_KEY,
            mobile: `91${phone}`,
            retrytype: retryType,
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.data && response.data.type === 'success') {
            return {
                success: true,
                message: 'OTP resent successfully',
            };
        } else {
            return {
                success: false,
                message: response.data?.message || 'Failed to resend OTP',
            };
        }
    } catch (error) {
        console.error('MSG91 Resend OTP Error:', error.response?.data || error.message);
        return {
            success: false,
            message: 'Failed to resend OTP. Please try again.',
        };
    }
};

module.exports = {
    sendOTP,
    verifyOTP,
    resendOTP,
};
