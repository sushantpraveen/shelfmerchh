const mongoose = require('mongoose');
require('dotenv').config({ path: '../backend/.env' });
const WithdrawalRequest = require('../backend/models/WithdrawalRequest');
const User = require('../backend/models/User');

const run = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Check counts by status
        const stats = await WithdrawalRequest.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log('Stats by status:', stats);

        // 2. Try to find PENDING requests
        const pendingReqs = await WithdrawalRequest.find({ status: 'PENDING' });
        console.log(`Found ${pendingReqs.length} PENDING requests via direct find.`);
        if (pendingReqs.length > 0) {
            console.log('First pending request:', JSON.stringify(pendingReqs[0], null, 2));
        }

        // 3. Check getAllForAdmin logic simulation
        const query = { status: 'PENDING' };
        // merchantId is undefined in the call usually
        const serviceResults = await WithdrawalRequest.find(query)
            .populate('merchantId', 'name email')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();
        
        console.log(`Found ${serviceResults.length} requests via service-like query.`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
