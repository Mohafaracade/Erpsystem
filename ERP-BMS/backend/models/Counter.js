const mongoose = require('mongoose');

/**
 * Counter Schema for Atomic Sequence Generation
 * Used for generating unique, sequential invoice numbers safely
 * even under concurrent requests
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
    }
}, {
    timestamps: false
});

/**
 * Get next sequence number atomically
 * This method is thread-safe and prevents race conditions
 * 
 * @param {String} sequenceName - Name of the sequence (e.g., 'invoice')
 * @returns {Promise<Number>} - Next sequence number
 */
counterSchema.statics.getNextSequence = async function (sequenceName) {
    const counter = await this.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { sequence: 1 } },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    return counter.sequence;
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
