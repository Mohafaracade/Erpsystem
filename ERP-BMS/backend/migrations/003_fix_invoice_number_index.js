const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Fix Invoice Number Index
 * 
 * ISSUE: E11000 duplicate key error on invoiceNumber
 * ROOT CAUSE: Old unique index on invoiceNumber alone (not scoped per company)
 * 
 * SOLUTION: Drop old invoiceNumber_1 index and ensure only compound index exists
 * Compound index: { company: 1, invoiceNumber: 1 } (unique: true)
 * 
 * This allows:
 * - Company A: INV-00001, INV-00002, ...
 * - Company B: INV-00001, INV-00002, ... (same numbers, different companies)
 */
const fixInvoiceNumberIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('invoices');

        // Get all indexes
        const indexes = await collection.indexes();
        console.log('\n📋 Current indexes on invoices collection:');
        indexes.forEach(index => {
            console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Check for old invoiceNumber_1 index (unique on invoiceNumber alone)
        const oldIndex = indexes.find(idx => 
            idx.name === 'invoiceNumber_1' && 
            Object.keys(idx.key).length === 1 && 
            idx.key.invoiceNumber !== undefined
        );

        if (oldIndex) {
            console.log('\n❌ Found old unique index on invoiceNumber alone:');
            console.log(`   Index name: ${oldIndex.name}`);
            console.log(`   Index key: ${JSON.stringify(oldIndex.key)}`);
            console.log(`   Unique: ${oldIndex.unique || false}`);

            // Drop the old index
            console.log('\n🗑️  Dropping old invoiceNumber_1 index...');
            await collection.dropIndex('invoiceNumber_1');
            console.log('✅ Old index dropped successfully');
        } else {
            console.log('\n✅ No old invoiceNumber_1 index found');
        }

        // Check for compound index { company: 1, invoiceNumber: 1 }
        const compoundIndex = indexes.find(idx => 
            idx.name === 'company_1_invoiceNumber_1' ||
            (idx.key.company !== undefined && idx.key.invoiceNumber !== undefined)
        );

        if (compoundIndex) {
            console.log('\n✅ Compound index found:');
            console.log(`   Index name: ${compoundIndex.name}`);
            console.log(`   Index key: ${JSON.stringify(compoundIndex.key)}`);
            console.log(`   Unique: ${compoundIndex.unique || false}`);

            if (!compoundIndex.unique) {
                console.log('\n⚠️  WARNING: Compound index exists but is NOT unique!');
                console.log('   Dropping and recreating with unique: true...');
                
                // Drop existing compound index
                await collection.dropIndex(compoundIndex.name);
                
                // Create new unique compound index
                await collection.createIndex(
                    { company: 1, invoiceNumber: 1 },
                    { unique: true, name: 'company_1_invoiceNumber_1' }
                );
                console.log('✅ Unique compound index created');
            }
        } else {
            console.log('\n⚠️  Compound index not found. Creating it...');
            await collection.createIndex(
                { company: 1, invoiceNumber: 1 },
                { unique: true, name: 'company_1_invoiceNumber_1' }
            );
            console.log('✅ Unique compound index created');
        }

        // Verify final state
        const finalIndexes = await collection.indexes();
        console.log('\n📋 Final indexes on invoices collection:');
        finalIndexes.forEach(index => {
            const isUnique = index.unique ? ' (UNIQUE)' : '';
            console.log(`   - ${index.name}: ${JSON.stringify(index.key)}${isUnique}`);
        });

        // Check for any remaining invoiceNumber-only indexes
        const remainingOldIndexes = finalIndexes.filter(idx => 
            idx.name.includes('invoiceNumber') && 
            Object.keys(idx.key).length === 1
        );

        if (remainingOldIndexes.length > 0) {
            console.log('\n⚠️  WARNING: Found remaining invoiceNumber-only indexes:');
            remainingOldIndexes.forEach(idx => {
                console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
            });
            console.log('   Consider dropping these manually if they cause conflicts.');
        } else {
            console.log('\n✅ No conflicting invoiceNumber-only indexes found');
        }

        console.log('\n✅ Migration complete!');
        console.log('\n📝 Summary:');
        console.log('   - Old invoiceNumber_1 index: Removed');
        console.log('   - Compound index { company: 1, invoiceNumber: 1 } (unique): Active');
        console.log('   - Each company can now have its own invoice numbering sequence');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

// Run migration
fixInvoiceNumberIndex();

