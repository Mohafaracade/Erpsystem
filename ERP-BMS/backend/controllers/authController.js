const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { successResponse, errorResponse } = require('../utils/response');
const emailService = require('../config/email');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
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

    // Generate token
    const token = user.generateAuthToken();

    // Log activity
    await ActivityLog.create({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'create',
      entityType: 'user',
      entityId: user._id,
      entityName: user.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    successResponse(res, 'User registered successfully', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    }, 201);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse(res, 'Account is deactivated', 401);
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
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'User not found', 404);
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

    if (!emailSent) {
      return errorResponse(res, 'Failed to send reset email', 500);
    }

    successResponse(res, 'Password reset email sent');
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

    // Check if email is taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return errorResponse(res, 'Email already in use', 400);
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