// FIX ISSUE #7: Financial calculation constants
// Standardize tolerance for floating-point comparisons

/**
 * Financial tolerance for floating-point comparisons
 * 
 * JavaScript floating-point arithmetic can produce tiny errors:
 * Example: 1000.00 - 999.99 = 0.009999999999990905
 * 
 * Use this tolerance to handle such errors:
 * - balanceDue <= FINANCIAL_TOLERANCE → treat as fully paid
 * - balanceDue > FINANCIAL_TOLERANCE → has outstanding balance
 * 
 * Value: $0.01 (one cent)
 * Rationale: Smaller than smallest currency unit, catches rounding errors
 */
const FINANCIAL_TOLERANCE = 0.01;

/**
 * Check if an amount is effectively zero (within tolerance)
 * @param {number} amount - Amount to check
 * @returns {boolean} - True if amount is zero within tolerance
 */
const isZero = (amount) => {
    return Math.abs(amount) <= FINANCIAL_TOLERANCE;
};

/**
 * Check if an amount is positive (above tolerance)
 * @param {number} amount - Amount to check
 * @returns {boolean} - True if amount is positive above tolerance
 */
const isPositive = (amount) => {
    return amount > FINANCIAL_TOLERANCE;
};

/**
 * Check if two amounts are equal (within tolerance)
 * @param {number} a - First amount
 * @param {number} b - Second amount
 * @returns {boolean} - True if amounts are equal within tolerance
 */
const areEqual = (a, b) => {
    return Math.abs(a - b) <= FINANCIAL_TOLERANCE;
};

module.exports = {
    FINANCIAL_TOLERANCE,
    isZero,
    isPositive,
    areEqual
};
