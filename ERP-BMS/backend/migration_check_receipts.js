/**
 * MIGRATION: Fix Double Revenue - Mark Payment-Linked Receipts
 * 
 * PURPOSE:
 * Before the fix, recordPayment created SalesReceipts with notes like "Payment for Invoice #..."
 * These are being counted in revenue calculations, causing double-counting.
 * 
 * This script identifies them and marks them by:
 * 1. Finding receipts with notes matching "Payment for Invoice"
 * 2. Setting their invoice field to a special marker or deleting them
 * 
 * SAFE APPROACH: We'll mark them as cancelled instead of deleting
 */

const mongoose = require('mongoose');
const SalesReceipt = require('./models/SalesReceipt');

async function migratePaymentLinkedReceipts() {
    try {
        console.log('🔍 Searching for payment-linked SalesReceipts...');

        // Find receipts that were created from invoice payments
        // They have distinctive characteristics:
        // - notes contain "Payment for Invoice"
        // - items array is empty
        // - created around same time as invoice payments

        const problematicReceipts = await SalesReceipt.find({
            $or: [
                { notes: { $regex: /Payment for Invoice/i } },
                {
                    items: { $size: 0 },
                    source: 'pos'
                }
            ]
        });

        console.log(`📊 Found ${problematicReceipts.length} potentially problematic receipts`);

        if (problematicReceipts.length === 0) {
            console.log('✅ No problematic receipts found. Database is clean!');
            return;
        }

        // Log details for review
        console.log('\\n📋 Details:');
        for (const receipt of problematicReceipts) {
            console.log(`  - ${receipt.salesReceiptNumber}: $${receipt.total} (${receipt.notes || 'No notes'})`);
        }

        console.log('\\n⚠️  RECOMMENDED ACTION:');
        console.log('These receipts should be marked as cancelled to exclude from revenue.');
        console.log('\\nRun: node migration_cancel_payment_receipts.js');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Connection and execution
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-system';

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        return migratePaymentLinkedReceipts();
    })
    .then(() => {
        console.log('\\n✅ Migration check complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\\n❌ Migration failed:', error);
        process.exit(1);
    });
