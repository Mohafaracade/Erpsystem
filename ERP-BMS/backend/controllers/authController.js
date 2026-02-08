const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { successResponse, errorResponse } = require('../utils/response');
const emailService = require('../config/email');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// @desc    Register user (DISABLED - Public registration disabled for security)
// @route   POST /api/auth/register
// @access  Public (DISABLED)
// NOTE: Public registration is disabled. Use admin-only user creation instead.
exports.register = async (req, res) => {
  return errorResponse(res, 'Public registration is disabled. Please contact your administrator to create an account.', 403);
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists (email is unique per company, but for login we check all)
    // For super_admin, email is globally unique
    const user = await User.findOne({ email }).select('+password').populate('company');
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated', 401);
    }

    // Validate company is active (unless super_admin)
    if (user.role !== 'super_admin' && user.company) {
      if (!user.company.isActive) {
        return errorResponse(res, 'Company account is inactive', 401);
      }
      if (user.company.subscription && 
          !['active', 'trial'].includes(user.company.subscription.status)) {
        return errorResponse(res, 'Company subscription is not active', 401);
      }
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    // Log activity
    await ActivityLog.create({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      company: user.company?._id || user.company || null,
      action: 'login',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    successResponse(res, 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company ? {
          id: user.company._id,
          name: user.company.name
        } : null,
        lastLogin: user.lastLogin
      },
      token
    });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      company: req.user.company?._id || req.user.company || null, // Optional for super_admin
      action: 'logout',
      entityType: 'user',
      entityId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    successResponse(res, 'Logged out successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    successResponse(res, 'User retrieved successfully', { user });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email, companyId } = req.body;

    // ✅ FIX #12: Scope password reset to company
    let query = { email: email.toLowerCase() };
    
    // If companyId provided, scope to that company (for regular users)
    if (companyId) {
      query.company = companyId;
    } else {
      // If no companyId, only allow super_admin password reset
      // (super_admin doesn't have a company)
      query.role = 'super_admin';
      query.company = { $exists: false };
    }

    const user = await User.findOne(query);
    
    // ✅ FIX #12: Don't reveal if user exists or not (security best practice)
    // Always return success message to prevent user enumeration
    if (!user) {
      return successResponse(res, 'If an account exists with this email, a password reset link has been sent.');
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save();

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const emailSent = await emailService.sendPasswordReset(
      user.email,
      resetToken,
      user.name
    );

    // Don't reveal if email failed (security best practice)
    // Log error server-side but return generic success message
    if (!emailSent) {
      console.error(`Failed to send password reset email to ${user.email}`);
    }

    successResponse(res, 'If an account exists with this email, a password reset link has been sent.');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Find user by reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 'Invalid or expired token', 400);
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log activity
    await ActivityLog.create({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      company: user.company?._id || user.company || null, // Optional for super_admin
      action: 'password_reset',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    successResponse(res, 'Password reset successful');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log activity
    await ActivityLog.create({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      company: user.company?._id || user.company || null, // Optional for super_admin
      action: 'password_change',
      entityType: 'user',
      entityId: user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    successResponse(res, 'Password changed successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findById(req.user.id);

    // ✅ FIX #7: Check if email is taken by another user (scoped to company)
    if (email && email !== user.email) {
      let emailQuery = { email: email.toLowerCase() };
      if (user.role === 'super_admin') {
        // Super admin email is globally unique
        emailQuery.company = { $exists: false };
      } else {
        // Regular users: unique per company
        emailQuery.company = user.company?._id || user.company;
      }
      const existingUser = await User.findOne(emailQuery);
      if (existingUser) {
        return errorResponse(res, 'Email already in use in this company', 400);
      }
    }

    // Update user
    user.name = name || user.name;
    user.email = email || user.email;
    await user.save();

    successResponse(res, 'Profile updated successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};