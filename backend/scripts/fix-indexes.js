const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function fixIndexes() {
    try {
        const mongoUri = process.env.MONGO_URL;
        if (!mongoUri) {
            console.error('MONGO_URL not found in environment variables');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected.');

        const User = mongoose.model('User', new mongoose.Schema({ email: String }));

        console.log('Fetching indexes for users collection...');
        const indexes = await User.collection.indexes();
        console.log('Current indexes:', indexes.map(idx => idx.name));

        // Check if email_1 exists
        const hasEmailIndex = indexes.some(idx => idx.name === 'email_1');

        if (hasEmailIndex) {
            console.log('Dropping email_1 index...');
            await User.collection.dropIndex('email_1');
            console.log('Index email_1 dropped successfully.');
        } else {
            console.log('email_1 index not found.');
        }

        // Also check for googleId_1 if it exists and might cause similar issues
        const hasGoogleIdIndex = indexes.some(idx => idx.name === 'googleId_1');
        if (hasGoogleIdIndex) {
            console.log('Dropping googleId_1 index...');
            await User.collection.dropIndex('googleId_1');
            console.log('Index googleId_1 dropped successfully.');
        }

        console.log('Done. Mongoose will recreate these indexes as sparse on next server restart.');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing indexes:', error);
        process.exit(1);
    }
}

fixIndexes();
