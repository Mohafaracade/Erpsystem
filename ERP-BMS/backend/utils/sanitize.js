/**
 * ✅ FIX #9: Input Sanitization Utilities
 * Sanitize user input before database queries to prevent injection
 */

/**
 * Sanitize string input for regex queries
 * Escapes special regex characters
 * @param {string} input - User input string
 * @returns {string} - Sanitized string safe for regex
 */
function sanitizeRegex(input) {
  if (typeof input !== 'string') return '';
  // Escape special regex characters
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize search query
 * Limits length and escapes special characters
 * @param {string} query - Search query
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string} - Sanitized query
 */
function sanitizeSearch(query, maxLength = 100) {
  if (typeof query !== 'string') return '';
  // Trim and limit length
  let sanitized = query.trim().substring(0, maxLength);
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  return sanitized;
}

/**
 * Sanitize date string
 * Validates and normalizes date format
 * @param {string} dateStr - Date string
 * @returns {Date|null} - Valid Date object or null
 */
function sanitizeDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Sanitize numeric input
 * @param {any} value - Input value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {number} defaultValue - Default if invalid
 * @returns {number} - Sanitized number
 */
function sanitizeNumber(value, min = 0, max = Infinity, defaultValue = 0) {
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitize pagination parameters
 * @param {any} page - Page number
 * @param {any} limit - Items per page
 * @param {number} maxLimit - Maximum limit (default: 100)
 * @returns {Object} - Sanitized { page, limit }
 */
function sanitizePagination(page, limit, maxLimit = 100) {
  const pageNum = sanitizeNumber(page, 1, Infinity, 1);
  const limitNum = sanitizeNumber(limit, 1, maxLimit, 10);
  return { page: pageNum, limit: limitNum };
}

module.exports = {
  sanitizeRegex,
  sanitizeSearch,
  sanitizeDate,
  sanitizeNumber,
  sanitizePagination
};

