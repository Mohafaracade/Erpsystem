const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

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

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.userId).select('-password');

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

    req.user = user;
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
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    // Determine action and entity type based on route
    const path = req.route.path;
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
      activityData.action = 'view';
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
    } else if (path.includes('reports')) {
      activityData.entityType = 'report';
    }

    // Add entity ID if available
    if (req.params.id) {
      activityData.entityId = req.params.id;
    }

    // Add details
    activityData.details = {
      method: method,
      path: path,
      params: req.params,
      query: req.query
    };

    await ActivityLog.create(activityData);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}