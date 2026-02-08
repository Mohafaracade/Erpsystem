/**
 * ✅ FIX #9: Centralized RBAC Permission System
 * Replaces hard-coded role checks with permission-based authorization
 */

const PERMISSIONS = {
  // User Management
  CREATE_USER: 'create_user',
  UPDATE_USER: 'update_user',
  DELETE_USER: 'delete_user',
  VIEW_USERS: 'view_users',
  
  // Company Management
  CREATE_COMPANY: 'create_company',
  UPDATE_COMPANY: 'update_company',
  DELETE_COMPANY: 'delete_company',
  VIEW_COMPANIES: 'view_companies',
  
  // Financial Operations
  APPROVE_EXPENSE: 'approve_expense',
  DELETE_EXPENSE: 'delete_expense',
  RECORD_PAYMENT: 'record_payment',
  DELETE_INVOICE: 'delete_invoice',
  
  // Reports
  VIEW_FINANCIAL_REPORTS: 'view_financial_reports',
  VIEW_SYSTEM_REPORTS: 'view_system_reports',
  EXPORT_DATA: 'export_data',
  
  // System
  MANAGE_SUBSCRIPTIONS: 'manage_subscriptions',
  ACCESS_ALL_COMPANIES: 'access_all_companies'
};

// Role to Permissions Mapping
const ROLE_PERMISSIONS = {
  super_admin: Object.values(PERMISSIONS), // All permissions
  
  company_admin: [
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.UPDATE_COMPANY,
    PERMISSIONS.VIEW_COMPANIES,
    PERMISSIONS.APPROVE_EXPENSE,
    PERMISSIONS.DELETE_EXPENSE,
    PERMISSIONS.RECORD_PAYMENT,
    PERMISSIONS.DELETE_INVOICE,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.VIEW_SYSTEM_REPORTS,
    PERMISSIONS.EXPORT_DATA
  ],
  
  admin: [
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.APPROVE_EXPENSE,
    PERMISSIONS.DELETE_EXPENSE,
    PERMISSIONS.RECORD_PAYMENT,
    PERMISSIONS.DELETE_INVOICE,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.VIEW_SYSTEM_REPORTS,
    PERMISSIONS.EXPORT_DATA
  ],
  
  accountant: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.RECORD_PAYMENT,
    PERMISSIONS.VIEW_FINANCIAL_REPORTS,
    PERMISSIONS.EXPORT_DATA
  ],
  
  staff: [
    PERMISSIONS.VIEW_USERS
  ]
};

/**
 * Check if user has a specific permission
 * @param {Object} user - User object with role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
function can(user, permission) {
  if (!user || !user.role) return false;
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
}

/**
 * Middleware factory for permission-based authorization
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!can(req.user, permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission} required`
      });
    }
    
    next();
  };
}

/**
 * Check if user can perform action on resource
 * @param {Object} user - User object
 * @param {string} action - Action to perform
 * @param {string} resource - Resource type
 * @returns {boolean}
 */
function canPerform(user, action, resource) {
  const permission = `${action}_${resource}`.toUpperCase();
  return can(user, PERMISSIONS[permission] || permission);
}

module.exports = {
  PERMISSIONS,
  can,
  requirePermission,
  canPerform
};

