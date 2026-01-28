const mongoose = require('mongoose');
const Customer = require('../models/Customer');
require('dotenv').config();

const migrateCustomers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const result = await Customer.updateMany(
            { status: { $exists: false } },
            { $set: { status: 'active' } }
        );

        console.log(`Migration complete. Updated ${result.modifiedCount} customers.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateCustomers();
