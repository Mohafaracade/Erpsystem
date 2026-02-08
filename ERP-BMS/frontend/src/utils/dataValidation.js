/**
 * ✅ FIX: Data validation utilities to prevent rendering wrong company data
 */

/**
 * Validates that all records belong to the correct company
 * @param {Array} records - Array of records to validate
 * @param {string} expectedCompanyId - The companyId that should match
 * @param {string} recordCompanyField - Field name in record that contains company (default: 'company')
 * @returns {Object} - { isValid: boolean, filteredRecords: Array, invalidCount: number }
 */
export const validateCompanyData = (records, expectedCompanyId, recordCompanyField = 'company') => {
  if (!records || !Array.isArray(records)) {
    return { isValid: false, filteredRecords: [], invalidCount: 0 }
  }

  if (expectedCompanyId === 'super_admin') {
    // Super admin can see all data
    return { isValid: true, filteredRecords: records, invalidCount: 0 }
  }

  if (!expectedCompanyId) {
    // No companyId means not authenticated - reject all
    return { isValid: false, filteredRecords: [], invalidCount: records.length }
  }

  const filteredRecords = []
  let invalidCount = 0

  for (const record of records) {
    const recordCompanyId = record[recordCompanyField]?._id || record[recordCompanyField]
    const recordCompanyIdStr = recordCompanyId?.toString()

    if (recordCompanyIdStr === expectedCompanyId.toString()) {
      filteredRecords.push(record)
    } else {
      invalidCount++
      console.warn('[DataValidation] Record with wrong companyId detected:', {
        recordId: record._id,
        expectedCompanyId,
        actualCompanyId: recordCompanyIdStr,
        record
      })
    }
  }

  return {
    isValid: invalidCount === 0,
    filteredRecords,
    invalidCount
  }
}

/**
 * Validates a single record belongs to the correct company
 * @param {Object} record - Record to validate
 * @param {string} expectedCompanyId - The companyId that should match
 * @param {string} recordCompanyField - Field name in record that contains company (default: 'company')
 * @returns {boolean}
 */
export const validateSingleRecord = (record, expectedCompanyId, recordCompanyField = 'company') => {
  if (!record) return false
  if (expectedCompanyId === 'super_admin') return true
  if (!expectedCompanyId) return false

  const recordCompanyId = record[recordCompanyField]?._id || record[recordCompanyField]
  const recordCompanyIdStr = recordCompanyId?.toString()

  return recordCompanyIdStr === expectedCompanyId.toString()
}

