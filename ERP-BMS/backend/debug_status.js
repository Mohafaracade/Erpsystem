const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Invoice = require('./models/Invoice');
const SalesReceipt = require('./models/SalesReceipt');
const Expense = require('./models/Expense');

async function debugStatus() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB');

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        console.log(`Range: ${startOfMonth.toISOString()} to ${endOfToday.toISOString()}`);

        // Check Invoices details
        const invoices = await Invoice.find({
            invoiceDate: { $gte: startOfMonth, $lte: endOfToday }
        }).select('invoiceNumber status amountPaid total invoiceDate');

        console.log('\n--- Invoices in Range ---');
        if (invoices.length === 0) console.log('No invoices found.');
        invoices.forEach(inv => {
            console.log(`Inv: ${inv.invoiceNumber}, Status: ${inv.status}, Paid: ${inv.amountPaid}, Total: ${inv.total}, Date: ${inv.invoiceDate.toISOString()}`);
        });

        // Check Expenses details
        const expenses = await Expense.find({
            date: { $gte: startOfMonth, $lte: endOfToday }
        }).select('title status amount date');

        console.log('\n--- Expenses in Range ---');
        if (expenses.length === 0) console.log('No expenses found.');
        expenses.forEach(exp => {
            console.log(`Exp: ${exp.title}, Status: ${exp.status}, Amount: ${exp.amount}, Date: ${exp.date.toISOString()}`);
        });

        // Run the aggregation exactly as in the controller (with my fix)
        const groupBy = 'day';
        const dateFilter = { $gte: startOfMonth, $lte: endOfToday };

        // 1. Invoice Revenue Trend
        const revenueTrend = await Invoice.aggregate([
            {
                $match: {
                    invoiceDate: dateFilter,
                    status: { $nin: ['draft', 'cancelled'] }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
                    revenue: { $sum: '$amountPaid' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
        console.log('\nAggregation Revenue:', JSON.stringify(revenueTrend));

        // 2. Expense Trend (WITH FIX)
        const expenseTrend = await Expense.aggregate([
            { $match: { date: dateFilter } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    expenses: { $sum: '$amount' }
                }
            },
            { $sort: { '_id': 1 } }
        ]);
        console.log('\nAggregation Expenses:', JSON.stringify(expenseTrend));

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

debugStatus();
