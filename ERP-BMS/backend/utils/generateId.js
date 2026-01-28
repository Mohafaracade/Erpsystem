const Counter = require('../models/Counter');
const Invoice = require('../models/Invoice');
const SalesReceipt = require('../models/SalesReceipt');
const Customer = require('../models/Customer');
const Item = require('../models/Item');

/**
 * Generate unique invoice number using atomic counter
 * This is thread-safe and prevents race conditions under concurrent requests
 * @returns {Promise<String>} - Unique invoice number (format: INV-00001)
 */
exports.generateInvoiceNumber = async () => {
  try {
    // Get next sequence atomically
    const nextSeq = await Counter.getNextSequence('invoice');

    // Format as INV-00001, INV-00002, etc.
    return `INV-${nextSeq.toString().padStart(5, '0')}`;
  } catch (error) {
    console.error('[generateInvoiceNumber] Error:', error);
    throw new Error('Failed to generate invoice number');
  }
};

exports.generateReceiptNumber = async () => {
  try {
    // Get next sequence atomically
    const nextSeq = await Counter.getNextSequence('receipt');

    // Format as SR-00001, SR-00002, etc.
    return `SR-${nextSeq.toString().padStart(5, '0')}`;
  } catch (error) {
    console.error('[generateReceiptNumber] Error:', error);
    throw new Error('Failed to generate receipt number');
  }
};

exports.generateCustomerCode = async (customerType) => {
  const prefix = customerType === 'business' ? 'BUS' : 'IND';
  const year = new Date().getFullYear().toString().slice(-2);

  const lastCustomer = await Customer.findOne({
    $or: [
      { code: new RegExp(`^${prefix}${year}`) },
      { customerType }
    ]
  }).sort({ createdAt: -1 });

  let sequence = 1;

  if (lastCustomer) {
    const matches = lastCustomer.code?.match(/(\d+)$/);
    if (matches) {
      sequence = parseInt(matches[1]) + 1;
    }
  }

  return `${prefix}${year}${sequence.toString().padStart(4, '0')}`;
};

exports.generateItemCode = async (category) => {
  const categoryMap = {
    'product': 'PROD',
    'service': 'SERV',
    'material': 'MAT',
    'other': 'OTH'
  };

  const prefix = categoryMap[category] || 'OTH';
  const year = new Date().getFullYear().toString().slice(-2);

  const lastItem = await Item.findOne({
    code: new RegExp(`^${prefix}${year}`)
  }).sort({ createdAt: -1 });

  let sequence = 1;

  if (lastItem) {
    const matches = lastItem.code.match(/(\d+)$/);
    if (matches) {
      sequence = parseInt(matches[1]) + 1;
    }
  }

  return `${prefix}${year}${sequence.toString().padStart(4, '0')}`;
};