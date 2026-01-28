const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const Invoice = require('./models/Invoice');
const SalesReceipt = require('./models/SalesReceipt');
const Expense = require('./models/Expense');

async function debugAggregation() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startDate = new Date(startOfMonth.setHours(0, 0, 0, 0));
        const endDate = new Date(endOfMonth.setHours(23, 59, 59, 999));
        const dateFilter = { $gte: startDate, $lte: endDate };

        // 1. Invoice
        try {
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
            console.log('SUCCESS Invoice:', JSON.stringify(revenueTrend));
        } catch (e) {
            console.error('ERROR Invoice:', e.message);
        }

        // 2. SalesReceipt
        try {
            console.log('--- Testing SalesReceipt Aggregation ---');
            const posTrend = await SalesReceipt.aggregate([
                { $match: { receiptDate: dateFilter } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$receiptDate" } },
                        posRevenue: { $sum: '$total' }
                    }
                }
            ]);
            console.log('SUCCESS SalesReceipt:', JSON.stringify(posTrend));
        } catch (e) {
            console.error('ERROR SalesReceipt:', e.message);
        }

        // 3. Expense
        try {
            console.log('--- Testing Expense Aggregation ---');
            const expenseTrend = await Expense.aggregate([
                { $match: { date: dateFilter } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        expenses: { $sum: '$amount' }
                    }
                }
            ]);
            console.log('SUCCESS Expense:', JSON.stringify(expenseTrend));
        } catch (e) {
            console.error('ERROR Expense:', e.message);
        }

    } catch (err) {
        console.error('Global ERROR:', err);
    } finally {
        await mongoose.disconnect();
    }
}

debugAggregation();
