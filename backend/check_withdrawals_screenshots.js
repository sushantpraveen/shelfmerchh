const mongoose = require('mongoose');
require('dotenv').config();

const WithdrawalRequest = require('./models/WithdrawalRequest');

async function checkWithdrawals() {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('✅ Connected to MongoDB');

        const withdrawals = await WithdrawalRequest.find({ status: 'PAID' })
            .limit(10)
            .sort({ paidAt: -1 });

        console.log(`\n📊 Found ${withdrawals.length} PAID withdrawals:\n`);

        withdrawals.forEach((w, index) => {
            console.log(`${index + 1}. ID: ${w._id}`);
            console.log(`   Amount: ₹${(w.amountPaise / 100).toFixed(2)}`);
            console.log(`   Status: ${w.status}`);
            console.log(`   UTR: ${w.payoutReference || 'N/A'}`);
            console.log(`   Screenshot URL: ${w.paymentScreenshotUrl || 'N/A'}`);
            console.log(`   Paid At: ${w.paidAt || 'N/A'}`);
            console.log('');
        });

        await mongoose.connection.close();
        console.log('✅ Connection closed');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkWithdrawals();
