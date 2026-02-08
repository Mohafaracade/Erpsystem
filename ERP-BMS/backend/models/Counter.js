const mongoose = require('mongoose');

/**
 * Counter Schema for Atomic Sequence Generation
 * Used for generating unique, sequential invoice numbers safely
 * even under concurrent requests
 * Now supports company-specific sequences for multi-tenancy
 * 
 * Counter ID Strategy:
 * - Company-specific: "invoice_<companyId>" (e.g., "invoice_507f1f77bcf86cd799439011")
 * - Global (backward compat): "invoice" (when companyId is null)
 */
const counterSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true
    },
    sequence: {
        type: Number,
        required: true,
        default: 0
    },
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: false, // For backward compatibility
        index: true
    },
    type: {
        type: String,
        required: false, // For tracking (invoice, receipt, etc.)
        index: true
    }
}, {
    timestamps: false
});

// Index on company for efficient queries
counterSchema.index({ company: 1 });
counterSchema.index({ type: 1, company: 1 });

/**
 * Generate counter ID based on sequence type and company
 * @param {String} sequenceName - Name of the sequence (e.g., 'invoice')
 * @param {String|ObjectId|null} companyId - Company ID (null for global/backward compat)
 * @returns {String} - Counter document _id
 */
counterSchema.statics.getCounterId = function (sequenceName, companyId = null) {
    if (companyId) {
        // Normalize companyId to string
        const companyIdStr = companyId.toString();
        return `${sequenceName}_${companyIdStr}`;
    }
    // Backward compatibility: use sequenceName as-is for null companyId
    return sequenceName;
};

/**
 * Normalize companyId to ObjectId or null
 * @param {String|ObjectId|null} companyId - Company ID
 * @returns {ObjectId|null} - Normalized ObjectId or null
 */
counterSchema.statics.normalizeCompanyId = function (companyId) {
    if (!companyId) return null;
    if (mongoose.Types.ObjectId.isValid(companyId)) {
        return new mongoose.Types.ObjectId(companyId);
    }
    return null;
};

/**
 * Get next sequence number atomically
 * This method is thread-safe and prevents race conditions
 * Now supports company-specific sequences using company-specific counter IDs
 * 
 * @param {String} sequenceName - Name of the sequence (e.g., 'invoice')
 * @param {String|ObjectId|null} companyId - Company ID for multi-tenancy (optional for backward compatibility)
 * @returns {Promise<Number>} - Next sequence number
 */
counterSchema.statics.getNextSequence = async function (sequenceName, companyId = null) {
    try {
        // ✅ FIX: Generate company-specific counter ID
        const counterId = this.getCounterId(sequenceName, companyId);
        
        // Normalize companyId for storage
        const normalizedCompanyId = this.normalizeCompanyId(companyId);
        
        // Query by the generated counter ID (unique per company)
        const query = { _id: counterId };

        // ✅ FIX: Atomic increment operation with upsert
        // CRITICAL: Do NOT include 'sequence' in $setOnInsert
        // MongoDB does NOT allow the same field in both $inc and $setOnInsert
        // When inserting: MongoDB creates doc with sequence: 0 (from schema default), then $inc increments to 1
        // When updating: $inc increments sequence normally
        const counter = await this.findOneAndUpdate(
            query,
            { 
                $inc: { sequence: 1 },
                $setOnInsert: { 
                    _id: counterId,
                    company: normalizedCompanyId,
                    type: sequenceName
                    // ✅ sequence is NOT included here - it uses schema default (0), then $inc increments it
                }
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        if (!counter) {
            throw new Error(`Failed to create or update counter for ${counterId}`);
        }

        return counter.sequence;
    } catch (error) {
        console.error('[Counter.getNextSequence] Error:', error);
        console.error('[Counter.getNextSequence] sequenceName:', sequenceName);
        console.error('[Counter.getNextSequence] companyId:', companyId);
        console.error('[Counter.getNextSequence] counterId:', this.getCounterId(sequenceName, companyId));
        
        // Re-throw with more context
        if (error.code === 11000) {
            throw new Error(`Duplicate key error on counter ${this.getCounterId(sequenceName, companyId)}. This should not happen with company-specific IDs.`);
        }
        throw error;
    }
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
