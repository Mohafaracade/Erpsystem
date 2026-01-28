const Expense = require('../models/Expense');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
exports.getAllExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = '-date',
      search,
      category,
      status,
      minAmount,
      maxAmount,
      startDate,
      endDate
    } = req.query;

    // Build query
    let query = {};

    // Search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by amount range
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) {
        query.amount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        query.amount.$lte = parseFloat(maxAmount);
      }
    }

    // Filter by date range
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const expenses = await Expense.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    // Get total count
    const total = await Expense.countDocuments(query);

    // Calculate pagination info
    const pagination = {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    paginatedResponse(res, 'Expenses retrieved successfully', expenses, pagination);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
exports.getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }

    successResponse(res, 'Expense retrieved successfully', expense);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private
exports.createExpense = async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      date,
      category,
      paymentMethod,
      vendor,
      receiptNumber,
      notes,
      recurring
    } = req.body;

    // Handle file attachments if any
    let attachments = [];
    if (req.files) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size
      }));
    }

    // Determine initial status - respect provided status if Admin, otherwise default based on role
    let initialStatus = req.user.role === 'admin' ? 'approved' : 'pending';
    if (req.user.role === 'admin' && ['approved', 'paid'].includes(req.body.status)) {
      initialStatus = req.body.status;
    }

    // Create expense
    const expense = await Expense.create({
      title,
      description,
      amount,
      date: date || new Date(),
      category: category || 'other',
      paymentMethod: paymentMethod || 'cash',
      vendor,
      receiptNumber,
      attachments,
      notes,
      recurring: recurring || { isRecurring: false },
      createdBy: req.user.id,
      status: initialStatus
    });

    // If approved or paid by admin, record approval info
    if (req.user.role === 'admin' && (initialStatus === 'approved' || initialStatus === 'paid')) {
      expense.approvedBy = req.user.id;
      expense.approvedDate = new Date();
      await expense.save();
    }

    successResponse(res, 'Expense created successfully', expense, 201);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }

    // Update fields
    const updateFields = [
      'title', 'description', 'amount', 'date', 'category', 'notes'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        expense[field] = req.body[field];
      }
    });

    // Handle recurring updates
    if (req.body.recurring !== undefined) {
      expense.recurring = req.body.recurring;
    }

    // Handle attachments if any
    if (req.files && req.files.length > 0) {
      expense.attachments = req.files.map(file => ({
        filename: file.originalname,
        path: file.path,
        mimetype: file.mimetype,
        size: file.size
      }));
    }

    await expense.save();

    successResponse(res, 'Expense updated successfully', expense);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }

    // Only admin can delete per user request
    if (req.user.role !== 'admin') {
      return errorResponse(res, 'Only administrators can delete expenses', 403);
    }

    // Delete attached files
    if (expense.attachments && expense.attachments.length > 0) {
      const fs = require('fs');
      expense.attachments.forEach(attachment => {
        if (fs.existsSync(attachment.path)) {
          fs.unlinkSync(attachment.path);
        }
      });
    }

    await expense.deleteOne();

    successResponse(res, 'Expense deleted successfully');
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Update expense status (approve/reject)
// @route   PUT /api/expenses/:id/status
// @access  Private (Admin/Accountant)
exports.updateExpenseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }

    if (!['pending', 'approved', 'rejected', 'paid'].includes(status)) {
      return errorResponse(res, 'Invalid status', 400);
    }

    // Update status
    expense.status = status;

    if (status === 'approved') {
      expense.approvedBy = req.user.id;
      expense.approvedDate = new Date();
    }

    await expense.save();

    successResponse(res, `Expense ${status} successfully`, expense);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Download expense attachment
// @route   GET /api/expenses/:id/attachments/:attachmentId
// @access  Private
exports.downloadAttachment = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return errorResponse(res, 'Expense not found', 404);
    }

    const attachment = expense.attachments.id(req.params.attachmentId);
    if (!attachment) {
      return errorResponse(res, 'Attachment not found', 404);
    }

    res.download(attachment.path, attachment.filename);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get expense statistics
// @route   GET /api/expenses/stats/overview
// @access  Private
exports.getExpenseStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let matchStage = {};
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = new Date(startDate);
      if (endDate) matchStage.date.$lte = new Date(endDate);
    }

    const stats = await Expense.aggregate([
      { $match: matchStage },
      {
        $facet: {
          totalExpenses: [
            { $match: { status: 'paid' } },
            { $count: 'count' }
          ],
          totalAmount: [
            { $match: { status: 'paid' } },
            {
              $group: {
                _id: null,
                total: { $sum: '$amount' }
              }
            }
          ],
          byCategory: [
            { $match: { status: 'paid' } },
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            }
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                amount: { $sum: '$amount' }
              }
            }
          ],
          recentExpenses: [
            { $match: { status: 'paid' } },
            { $sort: { date: -1 } },
            { $limit: 5 },
            {
              $project: {
                title: 1,
                amount: 1,
                category: 1,
                status: 1,
                date: 1
              }
            }
          ],
          monthlyExpenses: [
            { $match: { status: 'paid' } },
            {
              $group: {
                _id: {
                  year: { $year: '$date' },
                  month: { $month: '$date' }
                },
                amount: { $sum: '$amount' },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } },
            { $limit: 6 }
          ]
        }
      }
    ]);

    successResponse(res, 'Expense statistics retrieved', stats[0]);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Export expenses
// @route   GET /api/expenses/export/csv
// @access  Private
exports.exportExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    let query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    if (category) query.category = category;

    const expenses = await Expense.find({ ...query, status: 'paid' })
      .populate('createdBy', 'name')
      .select('title description amount date category paymentMethod vendor status')
      .sort('date');

    // Convert to CSV
    const csvHeader = 'Title,Description,Amount,Date,Category,Payment Method,Vendor,Status\n';
    const csvRows = expenses.map(expense => {
      return [
        `"${expense.title}"`,
        `"${expense.description || ''}"`,
        expense.amount,
        new Date(expense.date).toLocaleDateString(),
        expense.category,
        expense.paymentMethod,
        `"${expense.vendor || ''}"`,
        expense.status
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.send(csv);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};