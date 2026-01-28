const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const SalesReceipt = require('./models/SalesReceipt');

async function debugPOS() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const dateFilter = { $gte: startOfMonth, $lte: endOfMonth };

        console.log('--- Testing POS Aggregation ---');
        const posTrend = await SalesReceipt.aggregate([
            {
                $match: {
                    receiptDate: dateFilter,
                    source: 'pos',
                    status: 'completed'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$receiptDate" } },
                    posRevenue: { $sum: '$total' }
                }
            }
        ]);
        console.log('SUCCESS POS (Count):', posTrend.length);
        console.log('Sample:', JSON.stringify(posTrend[0]));

    } catch (e) {
        console.error('ERROR POS:', e);
    } finally {
        await mongoose.disconnect();
    }
}

debugPOS();
