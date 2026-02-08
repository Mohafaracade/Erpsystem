const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// ✅ FIX #13: Use cache abstraction layer (can switch to Redis later)
const cache = require('../utils/cache');
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedSubscription(companyId) {
  return cache.get(`subscription:${companyId}`);
}

function setCachedSubscription(companyId, subscriptionData) {
  cache.set(`subscription:${companyId}`, subscriptionData, CACHE_TTL);
}

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // ✅ FIX #8: Verify token with better error handling
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.'
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Token verification failed. Please login again.'
        });
      }
    }

    // Get user from token (populate company)
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('company', 'name email isActive subscription.status subscription.endDate');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    // ✅ FIX #11: Validate token companyId matches current user company
    if (decoded.companyId) {
      const currentCompanyId = user.company?._id?.toString() || user.company?.toString() || null;
      if (decoded.companyId !== currentCompanyId) {
        return res.status(401).json({
          success: false,
          message: 'Token invalid: Company changed. Please login again.'
        });
      }
    }

    // ✅ FIX #3 & #20: Validate company is active and subscription status (with caching)
    if (user.role !== 'super_admin' && user.company) {
      const companyId = user.company._id || user.company;
      
      // ✅ FIX #3: Check cache first to avoid DB query on every request
      let subscriptionData = getCachedSubscription(companyId.toString());
      
      if (!subscriptionData) {
        // Cache miss: fetch from database
        const Company = require('../models/Company');
        const company = await Company.findById(companyId).select('isActive subscription.status subscription.endDate');
        
        if (!company || !company.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Company account is inactive'
          });
        }
        
        subscriptionData = {
          isActive: company.isActive,
          subscriptionStatus: company.subscription?.status,
          subscriptionEndDate: company.subscription?.endDate
        };
        
        // Cache the result
        setCachedSubscription(companyId.toString(), subscriptionData);
      }
      
      // ✅ FIX #21: Check subscription status and endDate
      const subscriptionStatus = subscriptionData.subscriptionStatus;
      const subscriptionEndDate = subscriptionData.subscriptionEndDate;
      const now = new Date();
      
      // Check if subscription is active or trial
      if (!['active', 'trial'].includes(subscriptionStatus)) {
        return res.status(401).json({
          success: false,
          message: 'Company subscription is not active'
        });
      }
      
      // Check if trial/active subscription has expired
      if (subscriptionEndDate && subscriptionEndDate < now) {
        return res.status(401).json({
          success: false,
          message: 'Company subscription has expired'
        });
      }
      
      // Update user.company with cached data (lightweight)
      if (!user.company.isActive) {
        user.company.isActive = subscriptionData.isActive;
      }
      if (!user.company.subscription) {
        user.company.subscription = {
          status: subscriptionData.subscriptionStatus,
          endDate: subscriptionData.subscriptionEndDate
        };
      }
    }

    req.user = user;
    // Set company filter for non-super-admin users
    if (user.role === 'super_admin') {
      req.companyFilter = {}; // Super admin can access all companies
    } else {
      req.companyFilter = { company: user.company?._id || user.company };
    }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

exports.logActivity = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Only log successful requests (2xx status codes)
    if (res.statusCode >= 200 && res.statusCode < 300) {
      logUserActivity(req);
    }
    originalSend.call(this, data);
  };
  
  next();
};

async function logUserActivity(req) {
  try {
    if (!req.user) return;

    const activityData = {
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      company: req.user.company?._id || req.user.company || null,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Determine action and entity type based on route
    const path = req.route?.path || req.path;
    const method = req.method;

    if (path.includes('login')) {
      activityData.action = 'login';
      activityData.entityType = 'user';
    } else if (path.includes('logout')) {
      activityData.action = 'logout';
      activityData.entityType = 'user';
    } else if (method === 'POST') {
      activityData.action = 'create';
    } else if (method === 'PUT' || method === 'PATCH') {
      activityData.action = 'update';
    } else if (method === 'DELETE') {
      activityData.action = 'delete';
    } else if (method === 'GET') {
      // ✅ FIX #8: Only log critical GET requests (reports, exports), not all GETs
      if (path.includes('export') || path.includes('reports') || path.includes('activity')) {
        activityData.action = 'view';
      } else {
        // Skip logging routine GET requests to reduce storage
        return;
      }
    }

    // Determine entity type
    if (path.includes('customers')) {
      activityData.entityType = 'customer';
    } else if (path.includes('items')) {
      activityData.entityType = 'item';
    } else if (path.includes('invoices')) {
      activityData.entityType = 'invoice';
    } else if (path.includes('receipts')) {
      activityData.entityType = 'receipt';
    } else if (path.includes('expenses')) {
      activityData.entityType = 'expense';
    } else if (path.includes('users')) {
      activityData.entityType = 'user';
    } else if (path.includes('companies')) {
      activityData.entityType = 'company';
    } else if (path.includes('reports')) {
      activityData.entityType = 'report';
    }

    // Add entity ID if available
    if (req.params.id) {
      activityData.entityId = req.params.id;
    }

    // ✅ FIX #24: Enhanced logging for critical actions
    const criticalActions = ['role', 'subscription', 'company', 'user'];
    const isCriticalAction = criticalActions.some(keyword => 
      path.includes(keyword) || JSON.stringify(req.body).toLowerCase().includes(keyword)
    );

    // Add details with enhanced information for critical actions
    activityData.details = {
      method: method,
      path: path,
      params: req.params,
      query: req.query
    };

    // ✅ FIX #24 & #33: Log critical changes (role changes, company updates, etc.)
    if (isCriticalAction && (method === 'PUT' || method === 'PATCH' || method === 'POST' || method === 'DELETE')) {
      // ✅ FIX #8: For user updates, log role changes (from_role → to_role)
      if (path.includes('users') && req.body.role) {
        const previousRole = req.body.previousRole || req.body.roleChange?.from || 'unknown';
        activityData.details.roleChange = {
          from: previousRole,
          to: req.body.role
        };
        activityData.details.isCritical = true;
      }
      
      // ✅ FIX #8: Log payment operations
      if (path.includes('invoices') && path.includes('payment')) {
        activityData.action = 'payment';
        activityData.details.paymentAmount = req.body.amount;
        activityData.details.invoiceId = req.params.id;
        activityData.details.isCritical = true;
      }
      
      // For company updates, log subscription changes
      if (path.includes('companies') && req.body.subscription) {
        activityData.details.subscriptionChange = req.body.subscription;
        activityData.details.isCritical = true;
      }
      
      // Log request body for critical actions (sanitized)
      if (req.body) {
        const sanitizedBody = { ...req.body };
        // Remove sensitive fields
        delete sanitizedBody.password;
        delete sanitizedBody.token;
        activityData.details.requestBody = sanitizedBody;
      }
    }

    // ✅ FIX #33: Special logging for super_admin actions
    if (req.user.role === 'super_admin') {
      activityData.details.isSuperAdminAction = true;
      // Log all super admin actions with full details
      activityData.details.fullPath = req.originalUrl;
    }

    await ActivityLog.create(activityData);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}