/**
 * DIAGNOSTIC: Check Invoice Data Structure
 * 
 * This script helps diagnose why Invoice Analysis shows zero despite
 * having invoices in the database.
 * 
 * Run: node diagnostic_check_invoices.js
 */

const mongoose = require('mongoose');
const Invoice = require('./models/Invoice');

async function diagnoseInvoices() {
    try {
        console.log('🔍 Diagnostic Check: Invoice Data Structure\\n');

        // 1. Count total invoices
        const totalCount = await Invoice.countDocuments();
        console.log(`📊 Total Invoices in DB: ${totalCount}`);

        if (totalCount === 0) {
            console.log('❌ No invoices found in database!');
            return;
        }

        // 2. Get sample invoices
        const samples = await Invoice.find().limit(5).lean();
        console.log(`\\n📋 Sample Invoices (first 5):\\n`);

        samples.forEach((inv, idx) => {
            console.log(`--- Invoice ${idx + 1} ---`);
            console.log(`  Invoice Number: ${inv.invoiceNumber}`);
            console.log(`  Status: ${inv.status}`);
            console.log(`  Total: $${inv.total}`);
            console.log(`  Amount Paid: $${inv.amountPaid || 0}`);
            console.log(`  Invoice Date: ${inv.invoiceDate ? new Date(inv.invoiceDate).toISOString() : 'MISSING!'}`);
            console.log(`  Created At: ${inv.createdAt ? new Date(inv.createdAt).toISOString() : 'MISSING!'}`);
            console.log(`  Customer: ${inv.customer}`);
            console.log('');
        });

        // 3. Date range analysis
        const dateRange = {
            startDate: new Date('2026-01-01').toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
        };

        console.log(`\\n📅 Testing Date Range: ${dateRange.startDate} to ${dateRange.endDate}`);

        // Build match stage like invoiceController does
        const matchStage = {
            invoiceDate: {
                $gte: new Date(dateRange.startDate),
                $lte: (() => {
                    const end = new Date(dateRange.endDate);
                    end.setHours(23, 59, 59, 999);
                    return end;
                })()
            },
            status: { $ne: 'cancelled' }
        };

        console.log('\\n🔎 Match Stage:', JSON.stringify(matchStage, null, 2));

        const matchingInvoices = await Invoice.find(matchStage);
        console.log(`\\n✅ Invoices matching current month filter: ${matchingInvoices.length}`);

        if (matchingInvoices.length === 0) {
            console.log('\\n❌ PROBLEM FOUND: No invoices match the date filter!');
            console.log('   Possible causes:');
            console.log('   1. invoiceDate field is not set');
            console.log('   2. Invoices are outside the date range');
            console.log('   3. All invoices have status "cancelled"');

            // Check if invoiceDate exists
            const withoutDate = await Invoice.countDocuments({ invoiceDate: { $exists: false } });
            console.log(`\\n   Invoices without invoiceDate field: ${withoutDate}`);

            // Check status distribution
            const byStatus = await Invoice.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]);
            console.log('\\n   Status Distribution:', byStatus);
        } else {
            console.log('\\n✅ Date filter is working correctly!');
            matchingInvoices.forEach(inv => {
                console.log(`  - ${inv.invoiceNumber}: ${inv.status}, $${inv.total}, Date: ${inv.invoiceDate}`);
            });
        }

    } catch (error) {
        console.error('\\n❌ Diagnostic failed:', error);
        throw error;
    }
}

// Connection and execution
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-system';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB\\n');
        return diagnoseInvoices();
    })
    .then(() => {
        console.log('\\n✅ Diagnostic complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\\n❌ Diagnostic failed:', error);
        process.exit(1);
    });
