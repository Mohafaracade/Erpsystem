const Customer = require('../models/Customer');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { addCompanyFilter, validateCompanyOwnership } = require('../middleware/companyScope');

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getAllCustomers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-createdAt',
      search,
      customerType
    } = req.query;

    // Build query
    let query = {};

    // Search
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by customer type
    if (customerType) {
      query.customerType = customerType;
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Add company filter
    const companyFilteredQuery = addCompanyFilter(query, req);

    // Execute query with pagination
    const customers = await Customer.find(companyFilteredQuery)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name');

    // Get total count
    const total = await Customer.countDocuments(companyFilteredQuery);

    // Calculate pagination info
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    paginatedResponse(res, 'Customers retrieved successfully', customers, pagination);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Customer, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Customer not found', 404);
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    })
      .populate('createdBy', 'name');

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    successResponse(res, 'Customer retrieved successfully', { customer });
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  try {
    const { customerType, fullName, phone, email, address } = req.body;

    // Get company ID
    const companyId = req.user.company?._id || req.user.company;
    if (!companyId && req.user.role !== 'super_admin') {
      return errorResponse(res, 'Company association required', 400);
    }

    // Create customer
    const customer = await Customer.create({
      customerType,
      fullName,
      phone,
      email,
      address,
      company: companyId,
      createdBy: req.user.id
    });

    successResponse(res, 'Customer created successfully', customer, 201);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Customer, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Customer not found', 404);
    }

    const { customerType, fullName, phone, email, address } = req.body;

    const customer = await Customer.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    // Update only allowed fields
    if (customerType !== undefined) customer.customerType = customerType;
    if (fullName !== undefined) customer.fullName = fullName;
    if (phone !== undefined) customer.phone = phone;
    if (email !== undefined) customer.email = email;
    if (address !== undefined) customer.address = address;

    await customer.save();

    successResponse(res, 'Customer updated successfully', customer);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private (Admin only)
exports.deleteCustomer = async (req, res) => {
  try {
    // Validate company ownership
    const hasAccess = await validateCompanyOwnership(Customer, req.params.id, req);
    if (!hasAccess) {
      return errorResponse(res, 'Customer not found', 404);
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      ...addCompanyFilter({}, req)
    });

    if (!customer) {
      return errorResponse(res, 'Customer not found', 404);
    }

    await customer.deleteOne();

    successResponse(res, 'Customer deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get customer statistics
// @route   GET /api/customers/stats/overview
// @access  Private
exports.getCustomerStats = async (req, res) => {
  try {
    // Add company match stage
    const companyMatch = req.user.role === 'super_admin' ? {} : { company: req.user.company._id || req.user.company };

    const stats = await Customer.aggregate([
      { $match: companyMatch },
      {
        $facet: {
          totalCustomers: [
            { $count: 'count' }
          ],
          byType: [
            {
              $group: {
                _id: '$customerType',
                count: { $sum: 1 }
              }
            }
          ],
          recentCustomers: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                fullName: 1,
                customerType: 1,
                phone: 1,
                createdAt: 1
              }
            }
          ]
        }
      }
    ]);

    successResponse(res, 'Customer statistics retrieved', stats[0]);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Export customers
// @route   GET /api/customers/export/csv
// @access  Private
exports.exportCustomers = async (req, res) => {
  try {
    const customers = await Customer.find(addCompanyFilter({}, req))
      .select('fullName customerType phone email address createdAt')
      .sort('createdAt');

    // Convert to CSV
    const csvHeader = 'Full Name,Customer Type,Phone,Email,Address,Created At\n';
    const csvRows = customers.map(customer => {
      return [
        `"${customer.fullName}"`,
        customer.customerType,
        customer.phone,
        customer.email || '',
        `"${(customer.address || '').replace(/"/g, '""')}"`,
        new Date(customer.createdAt).toLocaleDateString()
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
    res.send(csv);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Bulk update customer status
// @route   PUT /api/customers/bulk/status
// @access  Private
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { customerIds, status } = req.body;

    if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
      return errorResponse(res, 'Customer IDs are required', 400);
    }

    if (!['active', 'inactive'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    const result = await Customer.updateMany(
      { 
        _id: { $in: customerIds },
        ...addCompanyFilter({}, req)
      },
      { $set: { status } }
    );

    successResponse(res, `${result.modifiedCount} customers updated successfully`);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};