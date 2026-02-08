const Company = require('../models/Company');
const User = require('../models/User');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// @desc    Get all companies (Super Admin only)
// @route   GET /api/companies
// @access  Private (Super Admin only)
exports.getAllCompanies = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search,
      status,
      subscriptionStatus
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

    // Filter by status
    if (status !== undefined) {
      query.isActive = status === 'true';
    }

    // Filter by subscription status
    if (subscriptionStatus) {
      query['subscription.status'] = subscriptionStatus;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const companies = await Company.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name email')
      .select('-__v');

    // Get total count
    const total = await Company.countDocuments(query);

    // Calculate pagination
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    paginatedResponse(res, 'Companies retrieved successfully', companies, pagination);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private (Super Admin or Company Admin of that company)
exports.getCompany = async (req, res) => {
  try {
    let company;

    if (req.user.role === 'super_admin') {
      // Super admin can access any company
      company = await Company.findById(req.params.id)
        .populate('createdBy', 'name email');
    } else {
      // ✅ FIX #4: Company admin can only access their own company
      // Use company from user object, not params, to prevent ID manipulation
      const companyId = req.user.company?._id || req.user.company;
      if (!companyId) {
        return errorResponse(res, 'Access denied', 403);
      }
      
      // ✅ Validate that requested ID matches user's company using ObjectId comparison
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(req.params.id) || 
          !mongoose.Types.ObjectId(req.params.id).equals(companyId)) {
        return errorResponse(res, 'Access denied', 403);
      }
      
      // Fetch company using user's company ID (not params.id)
      company = await Company.findById(companyId)
        .populate('createdBy', 'name email');
    }

    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    successResponse(res, 'Company retrieved successfully', company);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Create company (Super Admin only)
// @route   POST /api/companies
// @access  Private (Super Admin only)
exports.createCompany = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      subscription,
      settings
    } = req.body;

    // Check if company email exists
    const existingCompany = await Company.findOne({ email: email.toLowerCase() });
    if (existingCompany) {
      return errorResponse(res, 'Company with this email already exists', 400);
    }

    // Create company
    const company = await Company.create({
      name,
      email: email.toLowerCase(),
      phone,
      address,
      subscription: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'trial',
        startDate: subscription?.startDate || new Date(),
        endDate: subscription?.endDate,
        billingCycle: subscription?.billingCycle || 'monthly',
        maxUsers: subscription?.maxUsers || 5,
        maxStorage: subscription?.maxStorage || 1000
      },
      settings: {
        currency: settings?.currency || 'USD',
        timezone: settings?.timezone || 'UTC',
        dateFormat: settings?.dateFormat || 'YYYY-MM-DD',
        invoicePrefix: settings?.invoicePrefix || 'INV',
        receiptPrefix: settings?.receiptPrefix || 'REC'
      },
      isActive: true,
      activatedAt: new Date(),
      createdBy: req.user.id
    });

    successResponse(res, 'Company created successfully', company, 201);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private (Super Admin or Company Admin)
exports.updateCompany = async (req, res) => {
  try {
    let company;

    if (req.user.role === 'super_admin') {
      company = await Company.findById(req.params.id);
    } else {
      // ✅ FIX #4: Company admin can only update their own company
      const companyId = req.user.company?._id || req.user.company;
      if (!companyId) {
        return errorResponse(res, 'Access denied', 403);
      }
      
      // ✅ Validate using ObjectId comparison
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(req.params.id) || 
          !mongoose.Types.ObjectId(req.params.id).equals(companyId)) {
        return errorResponse(res, 'Access denied', 403);
      }
      
      // Use user's company ID, not params.id
      company = await Company.findById(companyId);
    }

    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    // Update fields (super admin can update all, company admin limited)
    const { name, email, phone, address, subscription, settings } = req.body;

    if (name !== undefined) company.name = name;
    if (phone !== undefined) company.phone = phone;
    if (address !== undefined) company.address = address;

    // Only super admin can update subscription
    if (req.user.role === 'super_admin' && subscription) {
      if (subscription.plan !== undefined) company.subscription.plan = subscription.plan;
      if (subscription.status !== undefined) company.subscription.status = subscription.status;
      if (subscription.endDate !== undefined) company.subscription.endDate = subscription.endDate;
      if (subscription.billingCycle !== undefined) company.subscription.billingCycle = subscription.billingCycle;
      if (subscription.maxUsers !== undefined) company.subscription.maxUsers = subscription.maxUsers;
      if (subscription.maxStorage !== undefined) company.subscription.maxStorage = subscription.maxStorage;
    }

    // Settings can be updated by company admin
    if (settings) {
      if (settings.currency !== undefined) company.settings.currency = settings.currency;
      if (settings.timezone !== undefined) company.settings.timezone = settings.timezone;
      if (settings.dateFormat !== undefined) company.settings.dateFormat = settings.dateFormat;
      if (settings.invoicePrefix !== undefined) company.settings.invoicePrefix = settings.invoicePrefix;
      if (settings.receiptPrefix !== undefined) company.settings.receiptPrefix = settings.receiptPrefix;
    }

    // Email update requires super admin
    if (email && req.user.role === 'super_admin') {
      const existingCompany = await Company.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: company._id }
      });
      if (existingCompany) {
        return errorResponse(res, 'Email already in use', 400);
      }
      company.email = email.toLowerCase();
    }

    await company.save();

    successResponse(res, 'Company updated successfully', company);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Delete company (Soft delete - Super Admin only)
// @route   DELETE /api/companies/:id
// @access  Private (Super Admin only)
exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    // Soft delete - deactivate instead of deleting
    company.isActive = false;
    company.deactivatedAt = new Date();
    await company.save();

    successResponse(res, 'Company deactivated successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Create user for company (Super Admin or Company Admin)
// @route   POST /api/companies/:id/users
// @access  Private (Super Admin or Company Admin)
exports.createCompanyUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const companyId = req.params.id;

    // Validate company access
    let company;
    if (req.user.role === 'super_admin') {
      company = await Company.findById(companyId);
    } else {
      // ✅ FIX #4: Company admin can only create users for their own company
      const userCompanyId = req.user.company?._id || req.user.company;
      if (!userCompanyId) {
        return errorResponse(res, 'Access denied', 403);
      }
      
      // ✅ Validate using ObjectId comparison
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(companyId) || 
          !mongoose.Types.ObjectId(companyId).equals(userCompanyId)) {
        return errorResponse(res, 'Access denied', 403);
      }
      
      company = await Company.findById(userCompanyId);
    }

    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    if (!company.isActive) {
      return errorResponse(res, 'Company is inactive', 400);
    }

    // Check user limit
    const userCount = await User.countDocuments({ company: companyId });
    if (userCount >= company.subscription.maxUsers) {
      return errorResponse(res, `User limit reached (${company.subscription.maxUsers})`, 400);
    }

    // Check if user exists (email unique per company)
    const existingUser = await User.findOne({ email: email.toLowerCase(), company: companyId });
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists in this company', 400);
    }

    // ✅ FIX #10: Prevent silent role downgrade - return error instead
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return errorResponse(res, 'Cannot assign super_admin role. Only super_admin can create super_admin users.', 403);
    }
    
    // Validate role assignment
    const allowedRole = role;

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: allowedRole || 'staff',
      company: companyId
    });

    successResponse(res, 'User created successfully', {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: companyId
    }, 201);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get company users
// @route   GET /api/companies/:id/users
// @access  Private (Super Admin or Company Admin)
exports.getCompanyUsers = async (req, res) => {
  try {
    const companyId = req.params.id;

    // ✅ FIX #4: Validate company access
    if (req.user.role !== 'super_admin') {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (!userCompanyId) {
        return errorResponse(res, 'Access denied', 403);
      }
      
      // ✅ Validate using ObjectId comparison
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(companyId) || 
          !mongoose.Types.ObjectId(companyId).equals(userCompanyId)) {
        return errorResponse(res, 'Access denied', 403);
      }
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return errorResponse(res, 'Company not found', 404);
    }

    const users = await User.find({ company: companyId })
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort('-createdAt');

    successResponse(res, 'Company users retrieved successfully', users);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get company statistics
// @route   GET /api/companies/:id/stats
// @access  Private (Super Admin or Company Admin)
exports.getCompanyStats = async (req, res) => {
  try {
    const companyId = req.params.id;

    // ✅ FIX #4: Validate company access
    if (req.user.role !== 'super_admin') {
      const userCompanyId = req.user.company?._id || req.user.company;
      if (!userCompanyId) {
        return errorResponse(res, 'Access denied', 403);
      }
      
      // ✅ Validate using ObjectId comparison
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(companyId) || 
          !mongoose.Types.ObjectId(companyId).equals(userCompanyId)) {
        return errorResponse(res, 'Access denied', 403);
      }
    }

    const Invoice = require('../models/Invoice');
    const Customer = require('../models/Customer');
    const Item = require('../models/Item');
    const Expense = require('../models/Expense');
    const SalesReceipt = require('../models/SalesReceipt');

    const [users, customers, invoices, items, expenses, receipts] = await Promise.all([
      User.countDocuments({ company: companyId }),
      Customer.countDocuments({ company: companyId }),
      Invoice.countDocuments({ company: companyId }),
      Item.countDocuments({ company: companyId }),
      Expense.countDocuments({ company: companyId }),
      SalesReceipt.countDocuments({ company: companyId })
    ]);

    successResponse(res, 'Company statistics retrieved', {
      users,
      customers,
      invoices,
      items,
      expenses,
      receipts
    });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

