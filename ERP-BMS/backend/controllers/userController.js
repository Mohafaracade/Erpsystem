const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

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
    const user = await User.findById(req.params.id)
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

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'User already exists', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'staff'
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
    const user = await User.findById(req.params.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Protection: Admins cannot update other Admins
    if (user.role === 'admin' && user._id.toString() !== req.user.id) {
      return errorResponse(res, 'You cannot update another administrator', 403);
    }

    // Update fields
    const { name, email, role, isActive } = req.body;

    if (name) user.name = name;
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return errorResponse(res, 'Email already in use', 400);
      }
      user.email = email;
    }
    if (role) user.role = role;
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
    const user = await User.findById(req.params.id);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user.id) {
      return errorResponse(res, 'Cannot delete your own account', 400);
    }

    // Protection: Admins cannot delete other Admins
    if (user.role === 'admin') {
      return errorResponse(res, 'You cannot delete another administrator', 403);
    }

    // Prevent deletion of last admin (redundant with above if not super-admin, but safe to keep)
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return errorResponse(res, 'Cannot delete the last admin', 400);
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

    let query = { user: req.params.id };

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
exports.exportActivityLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const activities = await ActivityLog.find(query)
      .populate('user', 'name email')
      .sort('-timestamp')
      .limit(1000); // Limit for export

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
    const stats = await User.aggregate([
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