/**
 * ✅ FIX #12: Centralized Company Filter Helper
 * Standardize on getCompanyFilter(req) for all queries
 * Super admins can access all companies, others are scoped to their company
 */

/**
 * Get company filter for queries (standardized helper)
 * @param {Object} req - Express request object
 * @returns {Object} Company filter object
 */
exports.getCompanyFilter = (req) => {
  if (req.user && req.user.role === 'super_admin') {
    // Super admin can access all companies
    return {};
  }
  
  if (req.user && req.user.company) {
    const companyId = req.user.company._id || req.user.company;
    return { company: companyId };
  }
  
  // If no company, return filter that matches nothing
  return { company: null };
};

/**
 * @deprecated Use getCompanyFilter(req) instead
 * Kept for backward compatibility
 */
exports.addCompanyFilter = (query, req) => {
  const companyFilter = exports.getCompanyFilter(req);
  return { ...query, ...companyFilter };
};

/**
 * Middleware to ensure company filter is available
 * @deprecated Company filter is set in auth middleware
 */
exports.companyScope = (req, res, next) => {
  // Company filter is already set in auth middleware
  // This middleware ensures it's always available
  if (!req.companyFilter) {
    req.companyFilter = exports.getCompanyFilter(req);
  }
  next();
};

/**
 * Validate that a resource belongs to user's company
 */
exports.validateCompanyOwnership = async (Model, resourceId, req) => {
  if (req.user.role === 'super_admin') {
    // Super admin can access any resource
    return true;
  }
  
  if (!req.user.company) {
    return false;
  }
  
  const companyId = req.user.company._id || req.user.company;
  const resource = await Model.findOne({
    _id: resourceId,
    company: companyId
  });
  
  return !!resource;
};

