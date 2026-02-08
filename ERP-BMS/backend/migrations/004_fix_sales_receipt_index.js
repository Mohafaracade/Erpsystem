const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Fix Sales Receipt Number Index
 * 
 * ISSUE: E11000 duplicate key error on salesReceiptNumber
 * ROOT CAUSE: Old unique index on salesReceiptNumber alone (not scoped per company)
 * 
 * SOLUTION: Drop old salesReceiptNumber_1 index and ensure only compound index exists
 * Compound index: { company: 1, salesReceiptNumber: 1 } (unique: true)
 * 
 * This allows:
 * - Company A: REC-00001, REC-00002, ...
 * - Company B: REC-00001, REC-00002, ... (same numbers, different companies)
 */
const fixSalesReceiptIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('salesreceipts');

        // Get all indexes
        const indexes = await collection.indexes();
        console.log('\n📋 Current indexes on salesreceipts collection:');
        indexes.forEach(index => {
            const isUnique = index.unique ? ' (UNIQUE)' : '';
            console.log(`   - ${index.name}: ${JSON.stringify(index.key)}${isUnique}`);
        });

        // Check for old salesReceiptNumber_1 index (unique on salesReceiptNumber alone)
        const oldIndex = indexes.find(idx => 
            (idx.name === 'salesReceiptNumber_1' || idx.name === 'salesReceiptNumber_1_1') && 
            Object.keys(idx.key).length === 1 && 
            idx.key.salesReceiptNumber !== undefined
        );

        if (oldIndex) {
            console.log('\n❌ Found old unique index on salesReceiptNumber alone:');
            console.log(`   Index name: ${oldIndex.name}`);
            console.log(`   Index key: ${JSON.stringify(oldIndex.key)}`);
            console.log(`   Unique: ${oldIndex.unique || false}`);

            // Drop the old index
            console.log('\n🗑️  Dropping old salesReceiptNumber index...');
            await collection.dropIndex(oldIndex.name);
            console.log(`✅ Old index "${oldIndex.name}" dropped successfully`);
        } else {
            console.log('\n✅ No old salesReceiptNumber-only index found');
        }

        // Check for compound index { company: 1, salesReceiptNumber: 1 }
        const compoundIndex = indexes.find(idx => 
            idx.name === 'company_1_salesReceiptNumber_1' ||
            (idx.key.company !== undefined && idx.key.salesReceiptNumber !== undefined)
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
                    { company: 1, salesReceiptNumber: 1 },
                    { unique: true, name: 'company_1_salesReceiptNumber_1' }
                );
                console.log('✅ Unique compound index created');
            }
        } else {
            console.log('\n⚠️  Compound index not found. Creating it...');
            await collection.createIndex(
                { company: 1, salesReceiptNumber: 1 },
                { unique: true, name: 'company_1_salesReceiptNumber_1' }
            );
            console.log('✅ Unique compound index created');
        }

        // Verify final state
        const finalIndexes = await collection.indexes();
        console.log('\n📋 Final indexes on salesreceipts collection:');
        finalIndexes.forEach(index => {
            const isUnique = index.unique ? ' (UNIQUE)' : '';
            console.log(`   - ${index.name}: ${JSON.stringify(index.key)}${isUnique}`);
        });

        // Check for any remaining salesReceiptNumber-only indexes
        const remainingOldIndexes = finalIndexes.filter(idx => 
            idx.name.includes('salesReceiptNumber') && 
            Object.keys(idx.key).length === 1
        );

        if (remainingOldIndexes.length > 0) {
            console.log('\n⚠️  WARNING: Found remaining salesReceiptNumber-only indexes:');
            remainingOldIndexes.forEach(idx => {
                console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
            });
            console.log('   Consider dropping these manually if they cause conflicts.');
        } else {
            console.log('\n✅ No conflicting salesReceiptNumber-only indexes found');
        }

        console.log('\n✅ Migration complete!');
        console.log('\n📝 Summary:');
        console.log('   - Old salesReceiptNumber-only index: Removed');
        console.log('   - Compound index { company: 1, salesReceiptNumber: 1 } (unique): Active');
        console.log('   - Each company can now have its own receipt numbering sequence');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

// Run migration
fixSalesReceiptIndex();

