const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const Invoice = require('./models/Invoice');

async function debugInvoice() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const dateFilter = { $gte: startOfMonth, $lte: endOfMonth };

        console.log('--- Testing Invoice Aggregation ---');
        const revenueTrend = await Invoice.aggregate([
            { $match: { invoiceDate: dateFilter } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
                    revenue: { $sum: '$amountPaid' }
                }
            }
        ]);
        console.log('SUCCESS Invoice (Count):', revenueTrend.length);
        console.log('Sample:', JSON.stringify(revenueTrend[0]));

    } catch (e) {
        console.error('ERROR Invoice:', e);
    } finally {
        await mongoose.disconnect();
    }
}

debugInvoice();
