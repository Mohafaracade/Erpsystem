const User = require('../models/User');
const Company = require('../models/Company');
const ActivityLog = require('../models/ActivityLog');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { addCompanyFilter } = require('../middleware/companyScope');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search,
      role,
      isActive
    } = req.query;

    // Build query
    let query = {};

    // Super admin can see all users, others only see users from their company
    if (req.user.role !== 'super_admin') {
      const companyId = req.user.company?._id || req.user.company;
      if (companyId) {
        query.company = companyId;
      } else {
        // No company = no users
        query.company = null;
      }
    }

    // Search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await User.countDocuments(query);

    // Calculate pagination info
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    paginatedResponse(res, 'Users retrieved successfully', users, pagination);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private (Admin only)
exports.getUser = async (req, res) => {
  try {
    let query = { _id: req.params.id };
    
    // Super admin can access any user, others only from their company
    if (req.user.role !== 'super_admin') {
      const companyId = req.user.company?._id || req.user.company;
      if (companyId) {
        query.company = companyId;
      } else {
        return errorResponse(res, 'User not found', 404);
      }
    }

    const user = await User.findOne(query)
      .select('-password -passwordResetToken -passwordResetExpires');

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, 'User retrieved successfully', user);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Create user (admin only)
// @route   POST /api/users
// @access  Private (Admin only)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // ✅ FIX #1: Get company ID (super admin can specify, others use their company)
    // Prevent IDOR: Never accept req.body.company from non-super_admin users
    let companyId;
    if (req.user.role === 'super_admin') {
      companyId = req.body.company; // Only super_admin can specify company
    } else {
      companyId = req.user.company?._id || req.user.company; // Force from token/user object
    }
    
    // ✅ FIX: Validate company requirement based on role
    const requestedRole = role || 'staff';
    
    // company_admin MUST have a company
    if (requestedRole === 'company_admin' && !companyId) {
      return errorResponse(res, 'Company association is required for company_admin role', 400);
    }
    
    // All non-super-admin roles require a company
    if (!companyId && requestedRole !== 'super_admin') {
      return errorResponse(res, 'Company association required', 400);
    }

    // ✅ FIX #18: Enforce user limit if company is specified
    if (companyId) {
      const company = await Company.findById(companyId);
      if (!company) {
        return errorResponse(res, 'Company not found', 404);
      }
      
      // Validate company is active (unless super_admin is creating)
      if (req.user.role !== 'super_admin' && !company.isActive) {
        return errorResponse(res, 'Cannot create user for inactive company', 400);
      }
      
      const userCount = await User.countDocuments({ company: companyId });
      if (userCount >= company.subscription.maxUsers) {
        return errorResponse(res, `User limit reached (${company.subscription.maxUsers}). Please upgrade your subscription.`, 400);
      }
    }

    // ✅ FIX #8: Check if user exists (email unique per company or globally for super_admin)
    let emailQuery = { email: email.toLowerCase() };
    if (requestedRole === 'super_admin') {
      // Super admin email is globally unique
      emailQuery.company = { $exists: false };
    } else {
      // Regular users: unique per company
      emailQuery.company = companyId;
    }
    const existingUser = await User.findOne(emailQuery);
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', 400);
    }

    // ✅ FIX #3: Validate role assignment
    const allowedRoles = req.user.role === 'super_admin' 
      ? ['super_admin', 'company_admin', 'admin', 'accountant', 'staff']
      : ['admin', 'accountant', 'staff']; // Non-super-admin users cannot create company_admin or super_admin
    
    if (!allowedRoles.includes(requestedRole)) {
      return errorResponse(res, `Invalid role assignment. Allowed roles: ${allowedRoles.join(', ')}`, 403);
    }
    
    // Prevent creating super_admin unless current user is super_admin
    if (requestedRole === 'super_admin' && req.user.role !== 'super_admin') {
      return errorResponse(res, 'Cannot assign super_admin role', 403);
    }
    
    // ✅ SECURITY FIX: Prevent company_admin from creating another company_admin
    if (requestedRole === 'company_admin' && req.user.role === 'company_admin') {
      return errorResponse(res, 'You cannot create another company admin. Only super_admin can create company_admin roles.', 403);
    }
    
    // ✅ FIX: Ensure company_admin has valid company before creation (double-check)
    if (requestedRole === 'company_admin' && !companyId) {
      return errorResponse(res, 'Company association is required for company_admin role', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: requestedRole,
      company: companyId || undefined
    });

    successResponse(res, 'User created successfully', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    }, 201);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin only)
exports.updateUser = async (req, res) => {
  try {
    // ✅ FIX #1: Enforce company isolation for non-super-admin
    let query = { _id: req.params.id };
    if (req.user.role !== 'super_admin') {
      const companyId = req.user.company?._id || req.user.company;
      if (companyId) {
        query.company = companyId;
      } else {
        return errorResponse(res, 'User not found', 404);
      }
    }

    const user = await User.findOne(query);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // ✅ SECURITY FIX: Protection - Regular admins cannot update other Admins
    // company_admin CAN update admin users (as per requirements)
    if (user.role === 'admin' && req.user.role === 'admin' && user._id.toString() !== req.user.id) {
      return errorResponse(res, 'You cannot update another administrator', 403);
    }
    
    // ✅ SECURITY FIX: Prevent company_admin from updating another company_admin
    if (user.role === 'company_admin' && req.user.role === 'company_admin' && user._id.toString() !== req.user.id) {
      return errorResponse(res, 'You cannot update another company admin. Only super_admin can update company_admin roles.', 403);
    }

    // Update fields
    const { name, email, role, isActive } = req.body;

    if (name) user.name = name;
    
    // ✅ FIX #8: Fix email uniqueness check with company scope
    if (email && email !== user.email) {
      let emailQuery = { email: email.toLowerCase() };
      if (user.role === 'super_admin') {
        // Super admin email is globally unique
        emailQuery.company = { $exists: false };
      } else {
        // Regular users: unique per company
        emailQuery.company = user.company;
      }
      const existingUser = await User.findOne(emailQuery);
      if (existingUser) {
        return errorResponse(res, 'Email already in use in this company', 400);
      }
      user.email = email.toLowerCase();
    }
    
    // ✅ FIX #3: Prevent role escalation
    // ✅ FIX #8: Capture role change for audit logging
    const previousRole = user.role;
    if (role) {
      // Define allowed roles based on current user's role
      const allowedRoles = req.user.role === 'super_admin' 
        ? ['super_admin', 'company_admin', 'admin', 'accountant', 'staff']
        : ['admin', 'accountant', 'staff']; // company_admin can't create super_admin or company_admin
      
      if (!allowedRoles.includes(role)) {
        return errorResponse(res, 'Invalid role assignment', 403);
      }
      
      // Prevent creating super_admin unless current user is super_admin
      if (role === 'super_admin' && req.user.role !== 'super_admin') {
        return errorResponse(res, 'Cannot assign super_admin role', 403);
      }
      
      // ✅ SECURITY FIX: Prevent company_admin from assigning company_admin role
      if (role === 'company_admin' && req.user.role === 'company_admin') {
        return errorResponse(res, 'You cannot assign company_admin role. Only super_admin can assign company_admin roles.', 403);
      }
      
      // ✅ SECURITY FIX: Prevent company_admin from changing another company_admin's role
      if (user.role === 'company_admin' && req.user.role === 'company_admin' && user._id.toString() !== req.user.id) {
        return errorResponse(res, 'You cannot modify another company admin. Only super_admin can modify company_admin roles.', 403);
      }
      
      // Prevent downgrading super_admin
      if (user.role === 'super_admin' && role !== 'super_admin' && req.user.role !== 'super_admin') {
        return errorResponse(res, 'Cannot modify super_admin role', 403);
      }
      
      // ✅ FIX #8: Store previous role for audit logging
      if (role !== previousRole) {
        req.body.previousRole = previousRole;
        req.body.roleChange = { from: previousRole, to: role };
      }
      
      user.role = role;
    }
    
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    successResponse(res, 'User updated successfully', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    // ✅ FIX #2: Enforce company isolation for non-super-admin
    let query = { _id: req.params.id };
    if (req.user.role !== 'super_admin') {
      const companyId = req.user.company?._id || req.user.company;
      if (companyId) {
        query.company = companyId;
      } else {
        return errorResponse(res, 'User not found', 404);
      }
    }

    const user = await User.findOne(query);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return errorResponse(res, 'Cannot delete your own account', 400);
    }

    // ✅ SECURITY FIX: Protection - Regular admins cannot delete other Admins
    // company_admin CAN delete admin users (as per requirements)
    if (user.role === 'admin' && req.user.role === 'admin') {
      return errorResponse(res, 'You cannot delete another administrator', 403);
    }
    
    // ✅ SECURITY FIX: Prevent company_admin from deleting another company_admin
    if (user.role === 'company_admin' && req.user.role === 'company_admin') {
      return errorResponse(res, 'You cannot delete another company admin. Only super_admin can delete company_admin roles.', 403);
    }

    // Prevent deletion of last admin (only for company-scoped admins)
    if (user.role === 'admin' && req.user.role !== 'super_admin') {
      const companyId = req.user.company?._id || req.user.company;
      const adminCount = await User.countDocuments({ 
        role: 'admin', 
        company: companyId 
      });
      if (adminCount <= 1) {
        return errorResponse(res, 'Cannot delete the last admin in this company', 400);
      }
    }
    
    // ✅ SECURITY FIX: Prevent deletion of last company_admin (only super_admin can delete company_admin)
    if (user.role === 'company_admin' && req.user.role !== 'super_admin') {
      const companyId = req.user.company?._id || req.user.company;
      const companyAdminCount = await User.countDocuments({ 
        role: 'company_admin', 
        company: companyId 
      });
      if (companyAdminCount <= 1) {
        return errorResponse(res, 'Cannot delete the last company admin in this company', 400);
      }
    }

    await user.deleteOne();

    successResponse(res, 'User deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get user activity logs
// @route   GET /api/users/:id/activity
// @access  Private (Admin only)
exports.getUserActivity = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    // Validate user access
    let targetUserId = req.params.id;
    if (req.user.role !== 'super_admin') {
      const companyId = req.user.company?._id || req.user.company;
      const targetUser = await User.findOne({ _id: targetUserId, company: companyId });
      if (!targetUser) {
        return errorResponse(res, 'User not found', 404);
      }
    }

    let query = { user: targetUserId };

    // Filter by date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get activity logs
    const activities = await ActivityLog.find(query)
      .sort('-timestamp')
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await ActivityLog.countDocuments(query);

    // Calculate pagination info
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    paginatedResponse(res, 'Activity logs retrieved', activities, pagination);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get system activity logs
// @route   GET /api/users/activity/system
// @access  Private (Admin only)
exports.getSystemActivity = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      action,
      entityType,
      userId
    } = req.query;

    let query = {};

    // Super admin can see all activity, others only from their company
    if (req.user.role !== 'super_admin') {
      const companyId = req.user.company?._id || req.user.company;
      if (companyId) {
        query.company = companyId;
      } else {
        query.company = null; // No company = no results
      }
    }

    // Filter by date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Filter by action
    if (action) {
      query.action = action;
    }

    // Filter by entity type
    if (entityType) {
      query.entityType = entityType;
    }

    // Filter by user
    if (userId) {
      query.user = userId;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get activity logs
    const activities = await ActivityLog.find(query)
      .populate('user', 'name email role')
      .sort('-timestamp')
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await ActivityLog.countDocuments(query);

    // Calculate pagination info
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    paginatedResponse(res, 'System activity logs retrieved', activities, pagination);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Export activity logs
// @route   GET /api/users/activity/export
// @access  Private (Admin only)
// ✅ FIX #3: Activity logs export with pagination (cursor-based)
exports.exportActivityLogs = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 1000 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 5000); // Max 5000 per page

    let query = {};
    
    // Super admin can see all activity, others only from their company
    if (req.user.role !== 'super_admin') {
      const companyId = req.user.company?._id || req.user.company;
      if (companyId) {
        query.company = companyId;
      } else {
        query.company = null; // No company = no results
      }
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // ✅ FIX #3: Pagination to avoid loading large datasets into memory
    const skip = (pageNum - 1) * limitNum;
    const [activities, totalCount] = await Promise.all([
      ActivityLog.find(query)
        .populate('user', 'name email')
        .sort('-timestamp')
        .skip(skip)
        .limit(limitNum)
        .lean(), // Use lean() for better performance
      ActivityLog.countDocuments(query)
    ]);

    // Convert to CSV
    const csvHeader = 'Timestamp,User,Role,Action,Entity Type,Entity ID,Details\n';
    const csvRows = activities.map(activity => {
      return [
        activity.timestamp.toISOString(),
        `"${activity.userName}"`,
        activity.userRole,
        activity.action,
        activity.entityType,
        activity.entityId || '',
        `"${JSON.stringify(activity.details).replace(/"/g, '""')}"`
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=activity_logs.csv');
    res.send(csv);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats/overview
// @access  Private (Admin only)
exports.getUserStats = async (req, res) => {
  try {
    // Add company match stage
    const companyMatch = req.user.role === 'super_admin' ? {} : 
      { company: req.user.company._id || req.user.company };

    const stats = await User.aggregate([
      { $match: companyMatch },
      {
        $facet: {
          totalUsers: [
            { $count: 'count' }
          ],
          byRole: [
            {
              $group: {
                _id: '$role',
                count: { $sum: 1 }
              }
            }
          ],
          byStatus: [
            {
              $group: {
                _id: '$isActive',
                count: { $sum: 1 }
              }
            }
          ],
          recentUsers: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                name: 1,
                email: 1,
                role: 1,
                createdAt: 1
              }
            }
          ]
        }
      }
    ]);

    successResponse(res, 'User statistics retrieved', stats[0]);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};