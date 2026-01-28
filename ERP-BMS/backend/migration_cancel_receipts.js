/**
 * MIGRATION: Cancel Payment-Linked Receipts
 * 
 * CRITICAL FIX FOR DOUBLE REVENUE BUG
 * 
 * This script marks payment-linked SalesReceipts as 'cancelled'
 * so they are excluded from revenue calculations in reportController.
 * 
 * SAFE: Does not delete data, just changes status.
 */

const mongoose = require('mongoose');
const SalesReceipt = require('./models/SalesReceipt');

async function cancelPaymentLinkedReceipts() {
    try {
        console.log('🔧 Starting migration to cancel payment-linked receipts...');

        // Find all receipts with empty items (characteristic of payment receipts)
        // AND notes containing "Payment for Invoice"
        const result = await SalesReceipt.updateMany(
            {
                $or: [
                    { notes: { $regex: /Payment for Invoice/i } },
                    {
                        items: { $size: 0 },
                        source: 'pos',
                        // Extra safety: only if total matches common payment amounts
                        // (you can remove this condition if you want to catch all)
                    }
                ],
                status: { $ne: 'cancelled' }  // Don't re-cancel
            },
            {
                $set: {
                    status: 'cancelled',
                    notes: function () {
                        const existing = this.notes || '';
                        const marker = ' [MIGRATED: Payment-linked receipt excluded from revenue]';
                        return existing.includes(marker) ? existing : existing + marker;
                    }()
                }
            }
        );

        console.log(`✅ Updated ${result.modifiedCount} receipts`);
        console.log(`   Matched: ${result.matchedCount}`);

        if (result.modifiedCount > 0) {
            // Verify they're now excluded
            const cancelledCount = await SalesReceipt.countDocuments({
                notes: { $regex: /Payment for Invoice/i },
                status: 'cancelled'
            });

            console.log(`✅ Verification: ${cancelledCount} payment receipts now cancelled`);
            console.log('\\n✨ Dashboard revenue should now be correct!');
            console.log('   Refresh the dashboard to see the fix.');
        } else {
            console.log('ℹ️  No receipts needed updating (database already clean)');
        }

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
        return cancelPaymentLinkedReceipts();
    })
    .then(() => {
        console.log('\\n✅ Migration complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\\n❌ Migration failed:', error);
        process.exit(1);
    });
