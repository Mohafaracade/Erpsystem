const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');
const Company = require('../models/Company');
require('dotenv').config();

/**
 * Initialize invoice counters for all companies
 * ✅ FIX: Now supports company-specific counters (invoice_<companyId>)
 * Each company gets its own independent counter
 */
const initInvoiceCounter = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // ✅ FIX: Get all companies
        const companies = await Company.find({}).select('_id name');
        console.log(`Found ${companies.length} companies`);

        if (companies.length === 0) {
            console.log('No companies found. Skipping counter initialization.');
            process.exit(0);
        }

        let totalCounters = 0;
        let skippedCounters = 0;

        // ✅ FIX: Initialize counter for each company
        for (const company of companies) {
            try {
                // Find the last invoice for this company
                const lastInvoice = await Invoice.findOne({ company: company._id })
                    .sort({ invoiceNumber: -1 })
                    .select('invoiceNumber');

                let sequence = 0;
                if (lastInvoice && lastInvoice.invoiceNumber) {
                    // Extract numeric part (assuming format INV-XXXXX or custom prefix)
                    const matches = lastInvoice.invoiceNumber.match(/(\d+)$/);
                    if (matches) {
                        sequence = parseInt(matches[1], 10);
                    }
                }

                // ✅ FIX: Generate company-specific counter ID
                const counterId = Counter.getCounterId('invoice', company._id);
                
                // ✅ FIX: Initialize counter with company-specific ID
                await Counter.findOneAndUpdate(
                    { _id: counterId },
                    { 
                        $set: { sequence },
                        $setOnInsert: {
                            company: company._id,
                            type: 'invoice'
                        }
                    },
                    { upsert: true, new: true }
                );

                console.log(`✅ Initialized counter for company "${company.name || company._id}": ${counterId} → sequence: ${sequence}`);
                totalCounters++;
            } catch (companyError) {
                console.error(`❌ Failed to initialize counter for company ${company._id}:`, companyError.message);
                skippedCounters++;
            }
        }

        // ✅ FIX: Also initialize global counter (backward compatibility)
        // Only if no companies exist or for legacy support
        const globalLastInvoice = await Invoice.findOne({ company: { $exists: false } })
            .sort({ invoiceNumber: -1 })
            .select('invoiceNumber');

        if (globalLastInvoice) {
            let globalSequence = 0;
            const matches = globalLastInvoice.invoiceNumber.match(/(\d+)$/);
            if (matches) {
                globalSequence = parseInt(matches[1], 10);
            }

            await Counter.findOneAndUpdate(
                { _id: 'invoice' },
                { 
                    $set: { sequence: globalSequence },
                    $setOnInsert: {
                        type: 'invoice'
                    }
                },
                { upsert: true, new: true }
            );
            console.log(`✅ Initialized global counter: invoice → sequence: ${globalSequence}`);
        }

        console.log(`\n✅ Migration complete:`);
        console.log(`   - Initialized ${totalCounters} company-specific counters`);
        if (skippedCounters > 0) {
            console.log(`   - Skipped ${skippedCounters} companies (errors)`);
        }
        if (globalLastInvoice) {
            console.log(`   - Initialized 1 global counter (backward compatibility)`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

initInvoiceCounter();
