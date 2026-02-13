const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

const User = require('../models/User');

async function migrateVerificationFields() {
    try {
        console.log('\n🔄 Starting migration to add verification tracking fields...\n');

        // Get all users
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users to migrate`);

        let emailVerifiedCount = 0;
        let phoneVerifiedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            let updated = false;

            // Set isEmailVerified if email exists and is not a dummy
            if (user.email && !user.email.includes('@dummy.com')) {
                if (user.isEmailVerified !== true) {
                    user.isEmailVerified = true;
                    updated = true;
                    emailVerifiedCount++;
                }
            }

            // Set isPhoneVerified if phone exists and is 10 digits
            if (user.phone && /^\d{10}$/.test(user.phone)) {
                if (user.isPhoneVerified !== true) {
                    user.isPhoneVerified = true;
                    updated = true;
                    phoneVerifiedCount++;
                }
            }

            // Initialize verification token fields if not exist
            if (user.phoneVerificationToken === undefined) {
                user.phoneVerificationToken = null;
                updated = true;
            }
            if (user.phoneVerificationTokenExpiry === undefined) {
                user.phoneVerificationTokenExpiry = null;
                updated = true;
            }
            if (user.emailVerificationToken === undefined) {
                user.emailVerificationToken = null;
                updated = true;
            }
            if (user.emailVerificationTokenExpiry === undefined) {
                user.emailVerificationTokenExpiry = null;
                updated = true;
            }

            if (updated) {
                await user.save({ validateBeforeSave: false });
            } else {
                skippedCount++;
            }
        }

        console.log('\n✅ Migration completed successfully!');
        console.log(`📧 Email verified: ${emailVerifiedCount} users`);
        console.log(`📱 Phone verified: ${phoneVerifiedCount} users`);
        console.log(`⏭️  Skipped (already up-to-date): ${skippedCount} users`);
        console.log(`\n✨ Total users processed: ${users.length}`);

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateVerificationFields();
