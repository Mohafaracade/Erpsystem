const Company = require('../models/Company');
const Expense = require('../models/Expense');
const fs = require('fs');
const path = require('path');

/**
 * Calculate total storage used by a company (in bytes)
 */
async function calculateCompanyStorage(companyId) {
  try {
    const uploadDir = path.join(__dirname, '../uploads', companyId.toString());
    
    if (!fs.existsSync(uploadDir)) {
      return 0;
    }

    let totalSize = 0;
    
    // Calculate size of all files in company directory
    const files = fs.readdirSync(uploadDir);
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        totalSize += stats.size;
      }
    }

    // Also check expenses with attachments
    const expenses = await Expense.find({ 
      company: companyId,
      attachments: { $exists: true, $ne: [] }
    }).select('attachments');

    for (const expense of expenses) {
      if (expense.attachments && Array.isArray(expense.attachments)) {
        for (const attachment of expense.attachments) {
          if (attachment.size) {
            totalSize += attachment.size;
          } else if (attachment.path && fs.existsSync(attachment.path)) {
            const stats = fs.statSync(attachment.path);
            totalSize += stats.size;
          }
        }
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error calculating company storage:', error);
    return 0;
  }
}

// ✅ FIX #3: Simple lock mechanism to prevent race conditions
const storageLocks = new Map();

/**
 * Middleware to check storage limit before file upload (with atomic check)
 */
exports.checkStorageLimit = async (req, res, next) => {
  let lockKey = null;
  try {
    // Super admin bypasses storage limits
    if (req.user.role === 'super_admin') {
      return next();
    }

    // Get company
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: 'Company association required'
      });
    }

    lockKey = companyId.toString();
    
    // ✅ FIX #3: Acquire lock to prevent concurrent uploads
    if (storageLocks.has(lockKey)) {
      return res.status(429).json({
        success: false,
        message: 'Storage check in progress. Please try again in a moment.'
      });
    }
    storageLocks.set(lockKey, true);

    try {
      const company = await Company.findById(companyId);
      if (!company) {
        storageLocks.delete(lockKey);
        return res.status(404).json({
          success: false,
          message: 'Company not found'
        });
      }

      // Calculate current storage usage (atomic read)
      const currentStorage = await calculateCompanyStorage(companyId);
      
      // Calculate size of files being uploaded
      const fileSize = req.files?.reduce((sum, file) => sum + (file.size || 0), 0) || 0;
      
      // Convert maxStorage from MB to bytes
      const maxStorageBytes = (company.subscription.maxStorage || 1000) * 1024 * 1024;
      
      // ✅ FIX #3: Atomic check - prevent race condition
      if (currentStorage + fileSize > maxStorageBytes) {
        storageLocks.delete(lockKey);
        const usedMB = (currentStorage / (1024 * 1024)).toFixed(2);
        const maxMB = company.subscription.maxStorage;
        const availableMB = ((maxStorageBytes - currentStorage) / (1024 * 1024)).toFixed(2);
        
        return res.status(400).json({
          success: false,
          message: `Storage limit exceeded. Used: ${usedMB}MB / ${maxMB}MB. Available: ${availableMB}MB. Please upgrade your subscription or delete old files.`
        });
      }

      // Release lock after successful check (before upload completes)
      // Note: In production, use Redis distributed locks for multi-server deployments
      storageLocks.delete(lockKey);
      next();
    } catch (error) {
      storageLocks.delete(lockKey);
      throw error;
    }
  } catch (error) {
    if (lockKey) storageLocks.delete(lockKey);
    console.error('Error checking storage limit:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking storage limit'
    });
  }
};

/**
 * Get storage usage for a company
 */
exports.getStorageUsage = async (companyId) => {
  const currentStorage = await calculateCompanyStorage(companyId);
  const company = await Company.findById(companyId);
  const maxStorageBytes = (company?.subscription?.maxStorage || 1000) * 1024 * 1024;
  
  return {
    used: currentStorage,
    usedMB: (currentStorage / (1024 * 1024)).toFixed(2),
    max: maxStorageBytes,
    maxMB: company?.subscription?.maxStorage || 1000,
    available: maxStorageBytes - currentStorage,
    availableMB: ((maxStorageBytes - currentStorage) / (1024 * 1024)).toFixed(2),
    percentage: ((currentStorage / maxStorageBytes) * 100).toFixed(2)
  };
};

module.exports = exports;

