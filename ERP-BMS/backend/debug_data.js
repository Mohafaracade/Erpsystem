const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Models
const Invoice = require('./models/Invoice');
const SalesReceipt = require('./models/SalesReceipt');
const Expense = require('./models/Expense');

async function debugData() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        console.log('Connecting to MongoDB...');

        if (!mongoUri) {
            console.error('MONGODB_URI not found in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');

        // Date Range: Start of current month to now
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        console.log(`\nChecking data for range: ${startOfMonth.toISOString()} to ${endOfToday.toISOString()}`);

        // Count All
        const totalInvoices = await Invoice.countDocuments();
        const totalReceipts = await SalesReceipt.countDocuments();
        const totalExpenses = await Expense.countDocuments();

        console.log('\n--- Total Counts (All Time) ---');
        console.log(`Invoices: ${totalInvoices}`);
        console.log(`SalesReceipts: ${totalReceipts}`);
        console.log(`Expenses: ${totalExpenses}`);

        // Count in Range
        const rangeInvoices = await Invoice.countDocuments({
            invoiceDate: { $gte: startOfMonth, $lte: endOfToday }
        });
        const rangeReceipts = await SalesReceipt.countDocuments({
            receiptDate: { $gte: startOfMonth, $lte: endOfToday }
        });
        const rangeExpenses = await Expense.countDocuments({
            date: { $gte: startOfMonth, $lte: endOfToday }
        });

        console.log('\n--- Counts in Current Month ---');
        console.log(`Invoices: ${rangeInvoices}`);
        console.log(`SalesReceipts: ${rangeReceipts}`);
        console.log(`Expenses: ${rangeExpenses}`);

        // Aggregation Test (Simulate Revenue Trend)
        console.log('\n--- Aggregation Test (Revenue Trend Simulation) ---');

        const revenueTrend = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: { $gte: startOfMonth, $lte: endOfToday },
                    status: { $nin: ['draft', 'cancelled'] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
                    revenue: { $sum: '$amountPaid' }
                }
            }
        ]);
        console.log('Revenue Trend Result:', JSON.stringify(revenueTrend, null, 2));

        const expenseTrend = await Expense.aggregate([
            {
                $match: {
                    date: { $gte: startOfMonth, $lte: endOfToday }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    expenses: { $sum: '$amount' }
                }
            }
        ]);
        console.log('Expense Trend Result:', JSON.stringify(expenseTrend, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected');
    }
}

debugData();
