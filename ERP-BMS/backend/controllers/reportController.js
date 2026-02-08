const Invoice = require('../models/Invoice');
const SalesReceipt = require('../models/SalesReceipt');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const { successResponse, errorResponse } = require('../utils/response');

// ✅ FIX #12: Use centralized company filter helper
const { getCompanyFilter } = require('../middleware/companyScope');

// Helper function to get previous period filter with correct date ranges
function getPreviousPeriodFilter(currentFilter) {
  const previousFilter = {};

  if (currentFilter.$gte && currentFilter.$lte) {
    // Range based calculation
    const currentStart = new Date(currentFilter.$gte);
    const currentEnd = new Date(currentFilter.$lte);
    const duration = currentEnd - currentStart;

    const prevEnd = new Date(currentStart);
    // Subtract 1 ms to prevent overlap
    prevEnd.setTime(prevEnd.getTime() - 1);

    const prevStart = new Date(prevEnd);
    prevStart.setTime(prevStart.getTime() - duration);

    previousFilter.$gte = prevStart;
    previousFilter.$lte = prevEnd;
  } else if (currentFilter.$gte) {
    // Open-ended start (e.g. "since..."), shift back by same duration from NOW?
    // Safer to just ignore or replicate same logic if no end date
    // For now assuming typical use case always has start/end for period comparison
    const startDate = new Date(currentFilter.$gte);
    const daysDiff = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
    previousFilter.$gte = previousStartDate;
  }

  return previousFilter;
}

// @desc    Get comprehensive reports data (single endpoint for all data)
// @route   GET /api/reports/comprehensive
// @access  Private
exports.getComprehensiveReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    
    const currentInvoiceQuery = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {})
    };
    const currentExpenseQuery = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
    };
    const currentReceiptQuery = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { receiptDate: dateFilter } : {})
    };

    const prevFilter = getPreviousPeriodFilter(dateFilter);
    const prevInvoiceQuery = { 
      ...companyFilter,
      ...(Object.keys(prevFilter).length > 0 ? { invoiceDate: prevFilter } : {})
    };
    const prevExpenseQuery = { 
      ...companyFilter,
      ...(Object.keys(prevFilter).length > 0 ? { date: prevFilter } : {})
    };
    const prevCustomerQuery = { 
      ...companyFilter,
      ...(Object.keys(prevFilter).length > 0 ? { createdAt: prevFilter } : {})
    };
    const prevReceiptQuery = { 
      ...companyFilter,
      ...(Object.keys(prevFilter).length > 0 ? { receiptDate: prevFilter } : {})
    };

    // Get all data in parallel
    const [
      revenueData,
      posRevenueData,
      expenseData,
      customerData,
      outstandingData,
      previousRevenueData,
      previousPosRevenueData,
      previousExpenseData,
      previousCustomerData,
      previousOutstandingData
    ] = await Promise.all([
      // Current period data: REAL_REVENUE = SUM(Invoice.amountPaid)
      // Note: We count ALL invoice payments. Linked SalesReceipts are excluded from POS revenue.
      Invoice.aggregate([
        {
          $match: {
            ...currentInvoiceQuery,
            status: { $nin: ['draft', 'cancelled'] }
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$amountPaid' } } }
      ]),
      // FIX ISSUE #3: POS Revenue - Defensive filter
      // Only count standalone POS receipts, NOT invoice-linked payments
      // This prevents double-counting (invoice payments counted via Invoice.amountPaid)
      SalesReceipt.aggregate([
        {
          $match: {
            ...currentReceiptQuery,
            source: 'pos',
            status: 'completed',
            invoice: null  // Explicitly exclude invoice-linked receipts
          }
        },
        { $group: { _id: null, posRevenue: { $sum: '$total' } } }
      ]),
      Expense.aggregate([
        { $match: { ...currentExpenseQuery, status: 'paid' } },
        { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
      ]),
      Customer.countDocuments({ 
        ...companyFilter,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
      }),
      Invoice.aggregate([
        {
          $match: {
            ...currentInvoiceQuery,
            status: { $in: ['sent', 'pending', 'partially_paid', 'overdue'] },
            balanceDue: { $gt: 0 }
          }
        },
        { $group: { _id: null, outstanding: { $sum: '$balanceDue' } } }
      ]),

      // Previous period data (for change calculations)
      Invoice.aggregate([
        {
          $match: {
            ...prevInvoiceQuery,
            status: { $nin: ['draft', 'cancelled'] }
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$amountPaid' } } }
      ]),
      SalesReceipt.aggregate([
        {
          $match: {
            ...prevReceiptQuery,
            source: 'pos',
            status: 'completed',
            invoice: null  // Defensive filter: exclude invoice-linked
          }
        },
        { $group: { _id: null, posRevenue: { $sum: '$total' } } }
      ]),
      Expense.aggregate([
        { $match: { ...prevExpenseQuery, status: 'paid' } },
        { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
      ]),
      Customer.countDocuments(prevCustomerQuery),
      Invoice.aggregate([
        {
          $match: {
            ...prevInvoiceQuery,
            status: { $in: ['sent', 'pending', 'partially_paid', 'overdue'] },
            balanceDue: { $gt: 0 }
          }
        },
        { $group: { _id: null, outstanding: { $sum: '$balanceDue' } } }
      ])
    ]);

    const totalRevenue = (revenueData[0]?.totalRevenue || 0) + (posRevenueData[0]?.posRevenue || 0);
    const totalExpenses = expenseData[0]?.totalExpenses || 0;
    const totalCustomers = customerData;
    const outstanding = outstandingData[0]?.outstanding || 0;
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    const previousRevenue = (previousRevenueData[0]?.totalRevenue || 0) + (previousPosRevenueData[0]?.posRevenue || 0);
    const previousExpenses = previousExpenseData[0]?.totalExpenses || 0;
    const previousCustomers = previousCustomerData;
    const previousOutstanding = previousOutstandingData[0]?.outstanding || 0;
    const previousProfit = previousRevenue - previousExpenses;
    const previousProfitMargin = previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0;

    // Calculate change percentages
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;
    const expensesChange = previousExpenses > 0 ? ((totalExpenses - previousExpenses) / previousExpenses) * 100 : 0;
    const customersChange = previousCustomers > 0 ? ((totalCustomers - previousCustomers) / previousCustomers) * 100 : 0;
    const outstandingChange = previousOutstanding > 0 ? ((outstanding - previousOutstanding) / previousOutstanding) * 100 : 0;
    const profitChange = previousProfit !== 0 ? ((profit - previousProfit) / Math.abs(previousProfit)) * 100 : (profit > 0 ? 100 : 0);
    const profitMarginChange = profitMargin - previousProfitMargin;

    const comprehensiveData = {
      totalRevenue,
      totalExpenses,
      profit,
      profitMargin,
      totalCustomers,
      outstanding,
      revenueChange,
      expensesChange,
      customersChange,
      outstandingChange,
      profitChange,
      profitMarginChange
    };

    successResponse(res, 'Comprehensive reports data retrieved', comprehensiveData);
  } catch (error) {
    console.error('Error in getComprehensiveReports:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get revenue trend data
// @route   GET /api/reports/revenue-trend
// @access  Private
exports.getRevenueTrend = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // ✅ FIX #4 & #6: Add company filter to all queries
    const companyFilter = getCompanyFilter(req);
    const invoiceMatch = { 
      ...companyFilter,  // ✅ FIX #4: Add company filter
      ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {})
    };
    const expenseMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
    };

    let groupStage;
    if (groupBy === 'day') {
      groupStage = {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } }
      };
    } else if (groupBy === 'month') {
      groupStage = {
        _id: { $dateToString: { format: "%Y-%m", date: "$invoiceDate" } }
      };
    } else {
      groupStage = {
        _id: { $dateToString: { format: "%Y", date: "$invoiceDate" } }
      };
    }

    const currentReceiptQuery = { 
      ...companyFilter,  // ✅ FIX #6: companyFilter is now defined
      ...(Object.keys(dateFilter).length > 0 ? { receiptDate: dateFilter } : {})
    };

    // 1. Invoice Revenue Trend (Paid amounts only)
    const revenueTrend = await Invoice.aggregate([
      {
        $match: {
          ...invoiceMatch,
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      {
        $group: {
          ...groupStage,
          revenue: { $sum: '$amountPaid' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 2. POS Receipts Revenue Trend (Strictly standalone POS, not linked to invoices)
    const posTrend = await SalesReceipt.aggregate([
      {
        $match: {
          ...currentReceiptQuery,
          source: 'pos',
          status: 'completed',
          invoice: null
        }
      },
      {
        $group: {
          _id: groupBy === 'day'
            ? { $dateToString: { format: "%Y-%m-%d", date: "$receiptDate" } }
            : groupBy === 'month'
              ? { $dateToString: { format: "%Y-%m", date: "$receiptDate" } }
              : { $dateToString: { format: "%Y", date: "$receiptDate" } },
          posRevenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 3. Expenses Trend
    const expenseTrend = await Expense.aggregate([
      { $match: { ...expenseMatch, status: 'paid' } },
      {
        $group: {
          _id: groupBy === 'day'
            ? { $dateToString: { format: "%Y-%m-%d", date: "$date" } }
            : groupBy === 'month'
              ? { $dateToString: { format: "%Y-%m", date: "$date" } }
              : { $dateToString: { format: "%Y", date: "$date" } },
          expenses: { $sum: '$amount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Merge all data points (Revenue + POS + Expenses)
    const periods = new Set([
      ...revenueTrend.map(r => r._id),
      ...posTrend.map(p => p._id),
      ...expenseTrend.map(e => e._id)
    ]);

    const mergedData = Array.from(periods).map(periodId => {
      const revenueItem = revenueTrend.find(r => r._id === periodId);
      const posItem = posTrend.find(p => p._id === periodId);
      const expenseItem = expenseTrend.find(e => e._id === periodId);

      const totalRevenue = (revenueItem?.revenue || 0) + (posItem?.posRevenue || 0);
      const totalExpenses = expenseItem?.expenses || 0;

      return {
        date: revenueItem?.date || posItem?.date || expenseItem?.date || periodId,
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses
      };
    }).sort((a, b) => a.date.localeCompare(b.date));

    successResponse(res, 'Revenue trend data retrieved', mergedData);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get monthly sales data
// @route   GET /api/reports/monthly-sales
// @access  Private
exports.getMonthlySales = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    const invoiceMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {})
    };

    const invoiceSales = await Invoice.aggregate([
      {
        $match: {
          ...invoiceMatch,
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$invoiceDate" } },
          month: { $dateToString: { format: "%b", date: "$invoiceDate" } },
          sales: { $sum: '$amountPaid' }
        }
      }
    ]);

    const receiptMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { receiptDate: dateFilter } : {}),
      source: 'pos',
      status: 'completed'
    };

    const posSales = await SalesReceipt.aggregate([
      {
        $match: receiptMatch
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$receiptDate" } },
          month: { $dateToString: { format: "%b", date: "$receiptDate" } },
          sales: { $sum: '$total' }
        }
      }
    ]);

    // Merge monthly sales
    const monthsSet = new Set([
      ...invoiceSales.map(i => i._id),
      ...posSales.map(p => p._id)
    ]);

    const mergedMonthlySales = Array.from(monthsSet).map(monthId => {
      const iItem = invoiceSales.find(i => i._id === monthId);
      const pItem = posSales.find(p => p._id === monthId);
      return {
        month: iItem?.month || pItem?.month,
        sales: (iItem?.sales || 0) + (pItem?.sales || 0)
      };
    }).sort((a, b) => a.month.localeCompare(b.month));

    successResponse(res, 'Monthly sales data retrieved', mergedMonthlySales);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get expenses by category
// @route   GET /api/reports/expenses-by-category
// @access  Private
exports.getExpensesByCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    const expenseMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
    };

    const expensesByCategory = await Expense.aggregate([
      { $match: { ...expenseMatch, status: 'paid' } },
      {
        $group: {
          _id: '$category',
          name: { $first: '$category' },
          value: { $sum: '$amount' }
        }
      },
      { $sort: { value: -1 } },
      {
        $project: {
          name: '$name',
          value: '$value'
        }
      }
    ]);

    successResponse(res, 'Expenses by category data retrieved', expensesByCategory);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get detailed transactions with pagination
// @route   GET /api/reports/transactions
// @access  Private
exports.getDetailedTransactions = async (req, res) => {
  const userId = req.user?._id;
  const companyId = req.user?.company?._id || req.user?.company;
  
  try {
    // ✅ STEP 1: Sanitize and normalize input parameters
    const { sanitizePagination, sanitizeSearch, sanitizeDate } = require('../utils/sanitize');
    const { page: pageRaw, limit: limitRaw } = sanitizePagination(req.query.page, req.query.limit, 100);
    const search = sanitizeSearch(req.query.search || '');
    const startDate = sanitizeDate(req.query.startDate);
    const endDate = sanitizeDate(req.query.endDate);
    const sortDirection = (req.query.sortDirection || 'desc').toLowerCase() === 'desc' ? -1 : 1;
    const limit = limitRaw || 10;

    // ✅ STEP 2: Normalize date filters safely (null-safe)
    const dateMatch = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        dateMatch.$gte = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        dateMatch.$lte = end;
      }
    }

    // ✅ STEP 3: Enforce company filter FIRST
    const companyFilter = getCompanyFilter(req);
    if (!companyFilter || Object.keys(companyFilter).length === 0) {
      // If no company filter, return empty (should not happen in production)
      return successResponse(res, 'Detailed transactions retrieved', {
        data: [],
        pagination: {
          total: 0,
          page: pageRaw,
          totalPages: 0,
          limit: limit
        }
      });
    }

    // ✅ STEP 4: Build search filters (null-safe)
    const invoiceSearchMatch = {};
    const receiptSearchMatch = {};
    const expenseSearchMatch = {};

    if (search && search.trim().length > 0) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      invoiceSearchMatch.$or = [
        { invoiceNumber: searchRegex },
        { 'customerDetails.name': searchRegex }
      ];
      receiptSearchMatch.$or = [
        { salesReceiptNumber: searchRegex },
        { 'customerDetails.name': searchRegex }
      ];
      expenseSearchMatch.$or = [
        { title: searchRegex },
        { category: searchRegex },
        { vendor: searchRegex }
      ];
    }

    // ✅ STEP 5: Build base match filters with company isolation
    const invoiceBaseMatch = { ...companyFilter, ...invoiceSearchMatch };
    const receiptBaseMatch = { ...companyFilter, ...receiptSearchMatch };
    const expenseBaseMatch = { ...companyFilter, ...expenseSearchMatch };

    // Add date filters if provided
    if (Object.keys(dateMatch).length > 0) {
      invoiceBaseMatch.invoiceDate = dateMatch;
      receiptBaseMatch.receiptDate = dateMatch;
      expenseBaseMatch.date = dateMatch;
    }

    // ✅ STEP 6: Build aggregation pipelines with IDENTICAL output shape
    // All pipelines MUST output: _id, type, date, amount, reference, company

    // Invoice pipeline
    const invoicePipeline = [
      { $match: invoiceBaseMatch },
      {
        $project: {
          _id: 1,
          type: { $literal: 'invoice' },
          date: { $ifNull: ['$invoiceDate', '$createdAt'] }, // Fallback to createdAt if invoiceDate missing
          amount: { $ifNull: ['$amountPaid', 0] }, // Use amountPaid (actual payment)
          reference: { $ifNull: ['$invoiceNumber', 'N/A'] },
          company: { $ifNull: ['$company', null] },
          status: { $ifNull: ['$status', 'unknown'] },
          customer: { $ifNull: ['$customerDetails.name', 'Unknown'] }
        }
      }
    ];

    // Receipt pipeline (standalone POS receipts only, exclude invoice-linked)
    const receiptPipeline = [
      { 
        $match: {
          ...receiptBaseMatch,
          invoice: null // Explicitly exclude invoice-linked receipts
        }
      },
      {
        $project: {
          _id: 1,
          type: { $literal: 'receipt' },
          date: { $ifNull: ['$receiptDate', '$createdAt'] }, // Fallback to createdAt if receiptDate missing
          amount: { $ifNull: ['$total', 0] },
          reference: { $ifNull: ['$salesReceiptNumber', 'N/A'] },
          company: { $ifNull: ['$company', null] },
          status: { $literal: 'paid' }, // Receipts are always paid
          customer: { $ifNull: ['$customerDetails.name', 'Walk-in'] }
        }
      }
    ];

    // Expense pipeline
    const expensePipeline = [
      { $match: expenseBaseMatch },
      {
        $project: {
          _id: 1,
          type: { $literal: 'expense' },
          date: { $ifNull: ['$date', '$createdAt'] }, // Fallback to createdAt if date missing
          amount: { $ifNull: ['$amount', 0] },
          reference: { $ifNull: ['$title', 'N/A'] }, // Expenses don't have numbers, use title
          company: { $ifNull: ['$company', null] },
          status: { $ifNull: ['$status', 'pending'] },
          customer: { $ifNull: ['$title', 'Unknown'] } // Use title as customer field
        }
      }
    ];

    // ✅ STEP 7: Use $unionWith to combine all sources safely
    // Start with invoices, then union with receipts and expenses
    // Get collection names from models (safer than hardcoding)
    const salesReceiptCollection = SalesReceipt.collection.name;
    const expenseCollection = Expense.collection.name;
    
    const transactions = await Invoice.aggregate([
      ...invoicePipeline,
      {
        $unionWith: {
          coll: salesReceiptCollection,
          pipeline: receiptPipeline
        }
      },
      {
        $unionWith: {
          coll: expenseCollection,
          pipeline: expensePipeline
        }
      },
      // Sort by date DESC
      { $sort: { date: sortDirection } },
      // Get total count before pagination
      {
        $facet: {
          total: [{ $count: 'count' }],
          data: [
            { $skip: (pageRaw - 1) * limit },
            { $limit: limit }
          ]
        }
      }
    ]);

    // ✅ STEP 8: Extract results safely
    const totalCount = transactions[0]?.total[0]?.count || 0;
    const data = transactions[0]?.data || [];

    // ✅ STEP 9: Format response (ensure date is string)
    const formattedTransactions = data.map(t => ({
      _id: t._id,
      type: t.type,
      date: t.date instanceof Date ? t.date.toISOString().split('T')[0] : (t.date || null),
      amount: Number(t.amount) || 0,
      reference: t.reference || 'N/A',
      status: t.status,
      customer: t.customer || 'Unknown'
    }));

    const pagination = {
      total: totalCount,
      page: pageRaw,
      totalPages: Math.ceil(totalCount / limit),
      limit: limit
    };

    const result = {
      data: formattedTransactions,
      pagination
    };

    return successResponse(res, 'Detailed transactions retrieved', result);

  } catch (error) {
    // ✅ CRITICAL FIX: Always log full error server-side (never expose stack in response)
    // ✅ STEP 10: Error handling - NEVER return 500, return empty array instead
    console.error('[getDetailedTransactions] Error:', {
      userId,
      companyId,
      endpoint: '/api/reports/transactions',
      method: req.method,
      error: error.message,
      stack: error.stack // ✅ Always log stack server-side only
    });

    // Return empty array instead of error (production-safe)
    return successResponse(res, 'Detailed transactions retrieved', {
      data: [],
      pagination: {
        total: 0,
        page: req.query.page ? parseInt(req.query.page) || 1 : 1,
        totalPages: 0,
        limit: req.query.limit ? parseInt(req.query.limit) || 10 : 10
      }
    });
  }
};

// @desc    Get dashboard overview
// @route   GET /api/reports/dashboard
// @access  Private
exports.getDashboardOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // ✅ FIX #16: Add company filter to all aggregations
    const companyFilter = getCompanyFilter(req);
    const invoiceMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {}),
      status: { $nin: ['draft', 'cancelled'] }
    };
    const expenseMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      status: 'paid'
    };
    const receiptMatch = {
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { receiptDate: dateFilter } : {}),
      source: 'pos',
      status: 'completed',
      invoice: null
    };

    const [
      revenueData,
      posRevenueData,
      expenseData,
      totalInvoices,
      totalCustomers
    ] = await Promise.all([
      Invoice.aggregate([
        {
          $match: invoiceMatch
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      SalesReceipt.aggregate([
        {
          $match: receiptMatch
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Expense.aggregate([
        { $match: expenseMatch },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Invoice.countDocuments(invoiceMatch),
      Customer.countDocuments(companyFilter)
    ]);

    const invoiceRevenue = revenueData[0]?.total || 0;
    const posRevenue = posRevenueData[0]?.total || 0;
    const totalRev = invoiceRevenue + posRevenue;
    const totalExp = expenseData[0]?.total || 0;

    const dashboardData = {
      totalRevenue: totalRev,
      totalExpenses: totalExp,
      totalInvoices,
      totalCustomers,
      profit: totalRev - totalExp
    };

    successResponse(res, 'Dashboard overview retrieved', dashboardData);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }

    const companyFilter = getCompanyFilter(req);
    
    const query = {
      ...companyFilter,
      status: { $nin: ['draft', 'cancelled'] }
    };
    if (Object.keys(dateFilter).length > 0) query.invoiceDate = dateFilter;

    const salesReport = await Invoice.find(query)
      .populate('customer', 'fullName')
      .sort({ invoiceDate: -1 });

    successResponse(res, 'Sales report retrieved', salesReport);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get customer report
// @route   GET /api/reports/customers
// @access  Private
exports.getCustomerReport = async (req, res) => {
  try {
    const companyFilter = getCompanyFilter(req);
    
    const customers = await Customer.find(companyFilter)
      .populate('invoices')
      .sort({ createdAt: -1 });

    successResponse(res, 'Customer report retrieved', customers);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get item sales report
// @route   GET /api/reports/items
// @access  Private
exports.getItemSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    const invoiceMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {})
    };

    const itemSales = await Invoice.aggregate([
      { $match: invoiceMatch },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.item', // Group by Item ID first
          itemName: { $first: '$items.itemDetails.name' }, // Use embedded details
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.amount' } // Use pre-calculated amount from invoice
        }
      },
      { $sort: { totalRevenue: -1 } },
      // Optional: Lookup latest name if needed, but embedded is faster/safer history
      {
        $project: {
          _id: '$_id', // Can use itemName as ID for frontend compatibility
          name: '$itemName',
          totalQuantity: 1,
          totalRevenue: 1
        }
      }
    ]);

    successResponse(res, 'Item sales report retrieved', itemSales);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get aging report
// @route   GET /api/reports/aging
// @access  Private
exports.getAgingReport = async (req, res) => {
  try {
    const companyFilter = getCompanyFilter(req);
    
    // FIX ISSUE #2: Only include invoices that are actually outstanding
    // Exclude: draft (not sent), paid (collected), cancelled (voided)
    // ✅ FIX #2: Use standardized financial tolerance
    const { FINANCIAL_TOLERANCE } = require('../utils/financialConstants');
    const agingReport = await Invoice.find({
      ...companyFilter,
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
      balanceDue: { $gt: FINANCIAL_TOLERANCE }  // ✅ FIX #2: Use standardized tolerance
    })
      .populate('customer', 'fullName phone email')
      .sort({ dueDate: 1 });

    successResponse(res, 'Aging report retrieved', agingReport);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get expense report
// @route   GET /api/reports/expenses
// @access  Private
exports.getExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }

    const companyFilter = getCompanyFilter(req);
    
    const query = { 
      ...companyFilter,
      status: 'paid' 
    };
    if (Object.keys(dateFilter).length > 0) query.date = dateFilter;

    const expenseReport = await Expense.find(query)
      .sort({ date: -1 });

    successResponse(res, 'Expense report retrieved', expenseReport);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get profit loss report
// @route   GET /api/reports/profit-loss
// @access  Private
// ✅ FIX #1: Profit & Loss report includes POS revenue (company-scoped)
exports.getProfitLossReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    
    const invoiceMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {})
    };
    const expenseMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
    };
    // ✅ FIX #1: Include POS revenue (standalone receipts only, exclude invoice-linked)
    const receiptMatch = {
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { receiptDate: dateFilter } : {}),
      source: 'pos',
      status: 'completed',
      invoice: null  // Only standalone POS transactions
    };

    const [revenueData, posRevenueData, expenseData] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            ...invoiceMatch,
            status: { $nin: ['draft', 'cancelled'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      // ✅ FIX #1: POS revenue aggregation (company-scoped)
      SalesReceipt.aggregate([
        { $match: receiptMatch },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Expense.aggregate([
        { $match: { ...expenseMatch, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const invoiceRevenue = revenueData[0]?.total || 0;
    const posRevenue = posRevenueData[0]?.total || 0;
    const totalRevenue = invoiceRevenue + posRevenue;  // ✅ FIX #1: Include POS revenue
    const totalExpenses = expenseData[0]?.total || 0;
    const profit = totalRevenue - totalExpenses;

    const profitLossReport = {
      totalRevenue,
      invoiceRevenue,
      posRevenue,
      totalExpenses,
      profit,
      profitMargin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
    };

    successResponse(res, 'Profit loss report retrieved', profitLossReport);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Export report
// @route   GET /api/reports/export/:type
// @access  Private
exports.exportReport = async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    // ✅ FIX #29: Limit export size to prevent resource exhaustion
    const MAX_EXPORT_RECORDS = 10000;

    let dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }

    const companyFilter = getCompanyFilter(req);
    
    let data;
    const query = { ...companyFilter };
    if (Object.keys(dateFilter).length > 0) query[type === 'sales' ? 'invoiceDate' : 'date'] = dateFilter;

    switch (type) {
      case 'sales':
        data = await Invoice.find(query)
          .populate('customer', 'fullName')
          .limit(MAX_EXPORT_RECORDS)
          .sort({ invoiceDate: -1 });
        break;
      case 'expenses':
        const expenseQuery = { ...query, status: 'paid' };
        data = await Expense.find(expenseQuery)
          .limit(MAX_EXPORT_RECORDS)
          .sort({ date: -1 });
        break;
      case 'customers':
        data = await Customer.find(companyFilter)
          .limit(MAX_EXPORT_RECORDS)
          .sort({ createdAt: -1 });
        break;
      default:
        return errorResponse(res, 'Invalid export type', 400);
    }

    if (data.length >= MAX_EXPORT_RECORDS) {
      return errorResponse(res, 
        `Export limit reached (${MAX_EXPORT_RECORDS} records). Please use date filters to reduce the dataset.`, 
        400
      );
    }

    successResponse(res, `${type} report data ready for export`, data);
  } catch (error) {
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get top customers by revenue
// @route   GET /api/reports/top-customers
// @access  Private
exports.getTopCustomers = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    const invoiceMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {})
    };

    const topCustomers = await Invoice.aggregate([
      {
        $match: {
          ...invoiceMatch,
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      {
        $group: {
          _id: '$customer',
          totalRevenue: { $sum: '$amountPaid' },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $unwind: '$customerInfo'
      },
      {
        $project: {
          _id: 0,
          name: '$customerInfo.fullName',
          revenue: '$totalRevenue',
          invoices: '$invoiceCount'
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    successResponse(res, 'Top customers retrieved', topCustomers);
  } catch (error) {
    console.error('Error in getTopCustomers:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get invoice status distribution
// @route   GET /api/reports/invoice-status
// @access  Private
exports.getInvoiceStatusDistribution = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    const invoiceMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {})
    };

    const statusDistribution = await Invoice.aggregate([
      {
        $match: {
          ...invoiceMatch,
          status: { $nin: ['cancelled'] } // Exclude cancelled
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1,
          amount: '$totalAmount'
        }
      },
      { $sort: { count: -1 } }
    ]);

    successResponse(res, 'Invoice status distribution retrieved', statusDistribution);
  } catch (error) {
    console.error('Error in getInvoiceStatusDistribution:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get revenue breakdown by payment method
// @route   GET /api/reports/revenue-by-payment-method
// @access  Private
exports.getRevenueByPaymentMethod = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    
    // Get revenue from invoice payments grouped by payment method
    const invoiceRevenue = await Invoice.aggregate([
      {
        $match: {
          ...companyFilter,
          ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {}),
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.method',
          revenue: { $sum: '$payments.amount' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          method: '$_id',
          revenue: 1,
          count: 1
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Get POS revenue by payment method
    const posRevenue = await SalesReceipt.aggregate([
      {
        $match: {
          ...companyFilter,
          ...(Object.keys(dateFilter).length > 0 ? { receiptDate: dateFilter } : {}),
          source: 'pos',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          revenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          method: '$_id',
          revenue: 1,
          count: 1
        }
      }
    ]);

    // Combine and aggregate
    const combined = {};
    [...invoiceRevenue, ...posRevenue].forEach(item => {
      const method = item.method || 'cash';
      if (!combined[method]) {
        combined[method] = { method, revenue: 0, count: 0 };
      }
      combined[method].revenue += item.revenue;
      combined[method].count += item.count;
    });

    const result = Object.values(combined).sort((a, b) => b.revenue - a.revenue);

    successResponse(res, 'Revenue by payment method retrieved', result);
  } catch (error) {
    console.error('Error in getRevenueByPaymentMethod:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get payment velocity metrics
// @route   GET /api/reports/payment-velocity
// @access  Private
exports.getPaymentVelocity = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    
    const velocityData = await Invoice.aggregate([
      {
        $match: {
          ...companyFilter,
          ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {}),
          status: 'paid',
          payments: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$payments' },
      {
        $addFields: {
          daysToPayment: {
            $divide: [
              { $subtract: ['$payments.date', '$invoiceDate'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
          avgDays: { $avg: '$daysToPayment' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          avgDays: { $round: ['$avgDays', 1] },
          invoices: '$count'
        }
      },
      { $sort: { month: 1 } }
    ]);

    successResponse(res, 'Payment velocity data retrieved', velocityData);
  } catch (error) {
    console.error('Error in getPaymentVelocity:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get collection rate metrics
// @route   GET /api/reports/collection-rate
// @access  Private
exports.getCollectionRate = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    
    const stats = await Invoice.aggregate([
      {
        $match: {
          ...companyFilter,
          ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {}),
          status: { $nin: ['draft', 'cancelled'] }
        }
      },
      {
        $facet: {
          total: [{ $count: 'count' }],
          paid: [
            { $match: { status: 'paid' } },
            { $count: 'count' }
          ],
          onTime: [
            {
              $match: {
                status: 'paid',
                $expr: {
                  $lte: [
                    { $arrayElemAt: ['$payments.date', 0] },
                    '$dueDate'
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          overdue: [
            { $match: { status: 'overdue' } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const totalCount = stats[0]?.total[0]?.count || 0;
    const paidCount = stats[0]?.paid[0]?.count || 0;
    const onTimeCount = stats[0]?.onTime[0]?.count || 0;
    const overdueCount = stats[0]?.overdue[0]?.count || 0;

    const collectionRate = totalCount > 0 ? (paidCount / totalCount) * 100 : 0;
    const onTimeRate = totalCount > 0 ? (onTimeCount / totalCount) * 100 : 0;
    const overdueRate = totalCount > 0 ? (overdueCount / totalCount) * 100 : 0;

    const result = {
      collectionRate: Math.round(collectionRate * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      overdueRate: Math.round(overdueRate * 10) / 10,
      totalInvoices: totalCount,
      paidInvoices: paidCount,
      onTimeInvoices: onTimeCount,
      overdueInvoices: overdueCount
    };

    successResponse(res, 'Collection rate metrics retrieved', result);
  } catch (error) {
    console.error('Error in getCollectionRate:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get expense trend over time
// @route   GET /api/reports/expense-trend
// @access  Private
exports.getExpenseTrend = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // ✅ FIX #16: Add company filter to aggregation
    const companyFilter = getCompanyFilter(req);
    const expenseMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
      status: 'paid'
    };

    let groupStage;
    if (groupBy === 'day') {
      groupStage = {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
      };
    } else if (groupBy === 'month') {
      groupStage = {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } }
      };
    } else {
      groupStage = {
        _id: { $dateToString: { format: '%Y', date: '$date' } }
      };
    }

    const trendData = await Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          ...groupStage,
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          period: '$_id',
          amount: 1,
          count: 1
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    successResponse(res, 'Expense trend data retrieved', trendData);
  } catch (error) {
    console.error('Error in getExpenseTrend:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get top vendors by spending
// @route   GET /api/reports/top-vendors
// @access  Private
exports.getTopVendors = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    const expenseMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
    };

    const topVendors = await Expense.aggregate([
      { $match: { ...expenseMatch, status: 'paid' } },
      {
        $group: {
          _id: '$vendor',
          totalSpent: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          vendor: { $ifNull: ['$_id', 'Unknown'] },
          spent: '$totalSpent',
          transactions: '$transactionCount'
        }
      },
      { $sort: { spent: -1 } },
      { $limit: parseInt(limit) }
    ]);

    successResponse(res, 'Top vendors retrieved', topVendors);
  } catch (error) {
    console.error('Error in getTopVendors:', error);
    errorResponse(res, error.message, 500);
  }
};

// @desc    Get expense metrics (averages, frequency)
// @route   GET /api/reports/expense-metrics
// @access  Private
exports.getExpenseMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const companyFilter = getCompanyFilter(req);
    const expenseMatch = { 
      ...companyFilter,
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
    };

    const metrics = await Expense.aggregate([
      { $match: { ...expenseMatch, status: 'paid' } },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' },
          count: { $sum: 1 },
          avgExpense: { $avg: '$amount' },
          maxExpense: { $max: '$amount' },
          minExpense: { $min: '$amount' }
        }
      }
    ]);

    // Calculate daily burn rate
    let dailyBurnRate = 0;
    if (startDate && endDate && metrics.length > 0) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
      dailyBurnRate = metrics[0].totalExpenses / daysDiff;
    }

    const result = {
      totalExpenses: metrics[0]?.totalExpenses || 0,
      expenseCount: metrics[0]?.count || 0,
      avgExpense: Math.round((metrics[0]?.avgExpense || 0) * 100) / 100,
      maxExpense: metrics[0]?.maxExpense || 0,
      minExpense: metrics[0]?.minExpense || 0,
      dailyBurnRate: Math.round(dailyBurnRate * 100) / 100
    };

    successResponse(res, 'Expense metrics retrieved', result);
  } catch (error) {
    console.error('Error in getExpenseMetrics:', error);
    errorResponse(res, error.message, 500);
  }
};


