const mongoose = require('mongoose');
const Counter = require('../models/Counter');
const Invoice = require('../models/Invoice');
const SalesReceipt = require('../models/SalesReceipt');
const Customer = require('../models/Customer');
const Item = require('../models/Item');
const Company = require('../models/Company');

/**
 * Normalize companyId to ObjectId or null
 * @param {String|ObjectId|null} companyId - Company ID
 * @returns {ObjectId|null} - Normalized ObjectId or null
 */
const normalizeCompanyId = (companyId) => {
  if (!companyId) return null;
  if (mongoose.Types.ObjectId.isValid(companyId)) {
    return new mongoose.Types.ObjectId(companyId);
  }
  return null;
};

/**
 * Generate unique invoice number using atomic counter
 * This is thread-safe and prevents race conditions under concurrent requests
 * Now supports company-specific prefixes and sequences
 * @param {String|ObjectId} companyId - Company ID for multi-tenancy
 * @returns {Promise<String>} - Unique invoice number (format: INV-00001 or company prefix)
 */
exports.generateInvoiceNumber = async (companyId = null) => {
  try {
    let prefix = 'INV';
    
    // ✅ FIX: Normalize companyId to ObjectId
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    // Get company settings for custom prefix
    if (normalizedCompanyId) {
      try {
        const company = await Company.findById(normalizedCompanyId).select('settings.invoicePrefix');
        if (company && company.settings && company.settings.invoicePrefix) {
          prefix = company.settings.invoicePrefix;
        }
      } catch (companyError) {
        console.warn('[generateInvoiceNumber] Could not fetch company settings, using default prefix:', companyError.message);
        // Continue with default prefix if company lookup fails
      }
    }

    // Get next sequence atomically (company-specific)
    const nextSeq = await Counter.getNextSequence('invoice', normalizedCompanyId);

    // Format as PREFIX-00001, PREFIX-00002, etc.
    return `${prefix}-${nextSeq.toString().padStart(5, '0')}`;
  } catch (error) {
    // ✅ CRITICAL FIX: Always log full error server-side (never expose stack in response)
    console.error('[generateInvoiceNumber] Error:', {
      companyId,
      normalizedCompanyId,
      error: error.message,
      stack: error.stack // ✅ Always log stack server-side only
    });
    throw new Error(`Failed to generate invoice number: ${error.message}`);
  }
};

/**
 * Generate unique receipt number using atomic counter
 * Company-specific: Each company has its own receipt counter
 * Counter ID format: receipt_<companyId> (e.g., "receipt_507f1f77bcf86cd799439011")
 * 
 * @param {String|ObjectId|null} companyId - Company ID for multi-tenancy
 * @returns {Promise<String>} - Unique receipt number (format: REC-00001)
 */
exports.generateReceiptNumber = async (companyId = null) => {
  try {
    let prefix = 'REC';
    
    // ✅ FIX: Normalize companyId (handles string, ObjectId, or null)
    // Counter.getNextSequence will handle normalization, but we normalize here for company lookup
    const normalizedCompanyId = normalizeCompanyId(companyId);
    
    // Get company settings for custom prefix (optional)
    if (normalizedCompanyId) {
      try {
        const company = await Company.findById(normalizedCompanyId).select('settings.receiptPrefix');
        if (company && company.settings && company.settings.receiptPrefix) {
          prefix = company.settings.receiptPrefix;
        }
      } catch (companyError) {
        console.warn('[generateReceiptNumber] Could not fetch company settings, using default prefix:', companyError.message);
        // Continue with default prefix if company lookup fails
      }
    }

    // ✅ FIX: Get next sequence atomically (company-specific)
    // Counter.getNextSequence will create counter with _id: "receipt_<companyId>"
    // This ensures each company has its own independent receipt numbering
    // Pass normalizedCompanyId (ObjectId or null) - Counter will handle it correctly
    const nextSeq = await Counter.getNextSequence('receipt', normalizedCompanyId || companyId);

    // Format as PREFIX-00001, PREFIX-00002, etc.
    // Example: REC-00001, REC-00002, REC-00003
    return `${prefix}-${nextSeq.toString().padStart(5, '0')}`;
  } catch (error) {
    // ✅ CRITICAL FIX: Always log full error server-side (never expose stack in response)
    const counterId = Counter.getCounterId('receipt', normalizedCompanyId || companyId);
    console.error('[generateReceiptNumber] Error:', {
      companyId,
      normalizedCompanyId,
      counterId,
      error: error.message,
      stack: error.stack // ✅ Always log stack server-side only
    });
    
    // Re-throw with clear error message (never expose stack)
    if (error.code === 11000) {
      throw new Error(`Duplicate key error on receipt counter. This should not happen with company-specific counters. Counter ID: ${counterId}`);
    }
    throw new Error(`Failed to generate sales receipt number: ${error.message}`);
  }
};

exports.generateCustomerCode = async (customerType, companyId = null) => {
  const prefix = customerType === 'business' ? 'BUS' : 'IND';
  const year = new Date().getFullYear().toString().slice(-2);

  const query = {
    $or: [
      { code: new RegExp(`^${prefix}${year}`) },
      { customerType }
    ]
  };
  
  // Add company filter for multi-tenancy
  if (companyId) {
    query.company = companyId;
  }

  const lastCustomer = await Customer.findOne(query).sort({ createdAt: -1 });

  let sequence = 1;

  if (lastCustomer) {
    const matches = lastCustomer.code?.match(/(\d+)$/);
    if (matches) {
      sequence = parseInt(matches[1]) + 1;
    }
  }

  return `${prefix}${year}${sequence.toString().padStart(4, '0')}`;
};

exports.generateItemCode = async (category, companyId = null) => {
  const categoryMap = {
    'product': 'PROD',
    'service': 'SERV',
    'material': 'MAT',
    'other': 'OTH'
  };

  const prefix = categoryMap[category] || 'OTH';
  const year = new Date().getFullYear().toString().slice(-2);

  const query = {
    code: new RegExp(`^${prefix}${year}`)
  };
  
  // Add company filter for multi-tenancy
  if (companyId) {
    query.company = companyId;
  }

  const lastItem = await Item.findOne(query).sort({ createdAt: -1 });

  let sequence = 1;

  if (lastItem) {
    const matches = lastItem.code?.match(/(\d+)$/);
    if (matches) {
      sequence = parseInt(matches[1]) + 1;
    }
  }

  return `${prefix}${year}${sequence.toString().padStart(4, '0')}`;
};