const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const Invoice = require('./models/Invoice');
const SalesReceipt = require('./models/SalesReceipt');
const Expense = require('./models/Expense');

async function debugAll() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        console.log('Connecting to:', mongoUri);
        await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startDate = new Date(startOfMonth.setHours(0, 0, 0, 0));
        const endDate = new Date(endOfMonth.setHours(23, 59, 59, 999));
        const dateFilter = { $gte: startDate, $lte: endDate };

        console.log(`Date Range: ${startDate.toISOString()} - ${endDate.toISOString()}`);

        // Test 1: Invoice
        console.log('\n--- Test 1: Invoice Aggregation ---');
        try {
            const invoices = await Invoice.find({ invoiceDate: dateFilter }).limit(1);
            console.log('Found Invoices Sample:', invoices.length);

            const revenueTrend = await Invoice.aggregate([
                { $match: { invoiceDate: dateFilter } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
                        revenue: { $sum: '$amountPaid' }
                    }
                }
            ]);
            console.log('Invoice Aggregation Result:', JSON.stringify(revenueTrend));
        } catch (e) {
            console.error('Invoice Aggregation FAILED:', e.message);
        }

        // Test 2: SalesReceipt
        console.log('\n--- Test 2: SalesReceipt Aggregation ---');
        try {
            const receipts = await SalesReceipt.find({ receiptDate: dateFilter }).limit(1);
            console.log('Found Receipts Sample:', receipts.length);

            const posTrend = await SalesReceipt.aggregate([
                { $match: { receiptDate: dateFilter } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$receiptDate" } },
                        posRevenue: { $sum: '$total' }
                    }
                }
            ]);
            console.log('SalesReceipt Aggregation Result:', JSON.stringify(posTrend));
        } catch (e) {
            console.error('SalesReceipt Aggregation FAILED:', e.message);
        }

        // Test 3: Expense
        console.log('\n--- Test 3: Expense Aggregation ---');
        try {
            const expenses = await Expense.find({ date: dateFilter }).limit(1);
            console.log('Found Expenses Sample:', expenses.length);

            const expenseTrend = await Expense.aggregate([
                { $match: { date: dateFilter } },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        expenses: { $sum: '$amount' }
                    }
                }
            ]);
            console.log('Expense Aggregation Result:', JSON.stringify(expenseTrend));
        } catch (e) {
            console.error('Expense Aggregation FAILED:', e.message);
        }

    } catch (err) {
        console.error('Global Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\nDone.');
    }
}

debugAll();
