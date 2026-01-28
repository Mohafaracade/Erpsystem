const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');
require('dotenv').config();

const initInvoiceCounter = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find the invoice with the highest number
        const lastInvoice = await Invoice.findOne()
            .sort({ invoiceNumber: -1 })
            .select('invoiceNumber');

        let sequence = 0;
        if (lastInvoice && lastInvoice.invoiceNumber) {
            // Extract numeric part (assuming format INV-XXXXX)
            const matches = lastInvoice.invoiceNumber.match(/(\d+)$/);
            if (matches) {
                sequence = parseInt(matches[1], 10);
            }
        }

        console.log(`Found last sequence: ${sequence}`);

        await Counter.findOneAndUpdate(
            { _id: 'invoice' },
            { $set: { sequence } },
            { upsert: true, new: true }
        );

        console.log(`Counter initialized to ${sequence}`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

initInvoiceCounter();
