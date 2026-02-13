const axios = require('axios');
require('dotenv').config();

/**
 * MSG91 OTP Test Script
 * Tests different payload configurations to identify the issue
 */

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_TEMPLATE_ID = process.env.MSG91_OTP_TEMPLATE_ID;
const TEST_PHONE = '8090929644'; // Replace with your test number

async function testMSG91() {
    console.log('=== MSG91 OTP Test ===\n');
    console.log('Auth Key:', MSG91_AUTH_KEY ? '✓ Set' : '✗ Missing');
    console.log('Template ID:', MSG91_TEMPLATE_ID || '✗ Missing');
    console.log('Test Phone:', TEST_PHONE);
    console.log('\n--- Testing Payload Configuration ---\n');

    // Test 1: Current implementation with otp_length
    console.log('Test 1: With otp_length parameter');
    try {
        const payload1 = {
            template_id: MSG91_TEMPLATE_ID,
            mobile: `91${TEST_PHONE}`,
            authkey: MSG91_AUTH_KEY,
            otp_length: 6,
        };

        console.log('Payload:', JSON.stringify(payload1, null, 2));

        const response1 = await axios.post('https://control.msg91.com/api/v5/otp', payload1, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✓ Response:', response1.data);
        console.log('');
    } catch (error) {
        console.log('✗ Error:', error.response?.data || error.message);
        console.log('');
    }

    // Wait 5 seconds before next test
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Test 2: With invisible=true parameter (for testing)
    console.log('Test 2: With invisible=true (testing mode)');
    try {
        const payload2 = {
            template_id: MSG91_TEMPLATE_ID,
            mobile: `91${TEST_PHONE}`,
            authkey: MSG91_AUTH_KEY,
            otp_length: 6,
            invisible: 1, // Testing mode - shows OTP in response
        };

        console.log('Payload:', JSON.stringify(payload2, null, 2));

        const response2 = await axios.post('https://control.msg91.com/api/v5/otp', payload2, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✓ Response:', response2.data);
        console.log('');
    } catch (error) {
        console.log('✗ Error:', error.response?.data || error.message);
        console.log('');
    }

    console.log('\n=== Test Complete ===');
    console.log('\nNext Steps:');
    console.log('1. Check your phone for SMS');
    console.log('2. Check MSG91 Dashboard → SMS → Reports → SMS Logs');
    console.log('3. If no SMS received, the template may need DLT approval or variable configuration');
}

testMSG91().catch(console.error);
