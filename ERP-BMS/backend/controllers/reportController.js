const Invoice = require('../models/Invoice');
const SalesReceipt = require('../models/SalesReceipt');
const Expense = require('../models/Expense');
const Customer = require('../models/Customer');
const { successResponse, errorResponse } = require('../utils/response');

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

    const currentInvoiceQuery = Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {};
    const currentExpenseQuery = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};
    const currentReceiptQuery = Object.keys(dateFilter).length > 0 ? { receiptDate: dateFilter } : {};

    const prevFilter = getPreviousPeriodFilter(dateFilter);
    const prevInvoiceQuery = Object.keys(prevFilter).length > 0 ? { invoiceDate: prevFilter } : {};
    const prevExpenseQuery = Object.keys(prevFilter).length > 0 ? { date: prevFilter } : {};
    const prevCustomerQuery = Object.keys(prevFilter).length > 0 ? { createdAt: prevFilter } : {};
    const prevReceiptQuery = Object.keys(prevFilter).length > 0 ? { receiptDate: prevFilter } : {};

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
      Customer.countDocuments(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
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

    const invoiceMatch = Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {};
    const expenseMatch = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

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

    const currentReceiptQuery = Object.keys(dateFilter).length > 0 ? { receiptDate: dateFilter } : {};

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

    const invoiceMatch = Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {};

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

    const posSales = await SalesReceipt.aggregate([
      {
        $match: {
          receiptDate: dateFilter,
          source: 'pos',
          status: 'completed'
        }
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

    const expenseMatch = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

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
  try {
    const {
      startDate,
      endDate,
      search = '',
      page = 1,
      limit = 10,
      sort = 'date',
      sortDirection = 'desc'
    } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }

    // Build search filters for each model
    const invoiceSearchFilter = {};
    const expenseSearchFilter = {};

    if (search) {
      invoiceSearchFilter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerDetails.name': { $regex: search, $options: 'i' } }
      ];
      expenseSearchFilter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } }
      ];
    }

    // Build the base filters
    const invoiceFilter = { ...invoiceSearchFilter };
    const expenseFilter = { ...expenseSearchFilter };

    if (Object.keys(dateFilter).length > 0) {
      invoiceFilter.invoiceDate = dateFilter;
      expenseFilter.date = dateFilter;
    }

    // Include status filters if necessary (Optional, based on requirement)
    // invoiceFilter.status = { $nin: ['draft', 'cancelled'] };
    // expenseFilter.status = 'paid';

    // Fetch matching records
    const [invoices, expenses] = await Promise.all([
      Invoice.find(invoiceFilter)
        .select('invoiceNumber invoiceDate total amountPaid status customerDetails createdAt'),
      Expense.find(expenseFilter)
        .select('title amount date status createdAt')
    ]);

    // Combine and format transactions
    const allTransactions = [
      ...invoices.map(inv => ({
        date: inv.invoiceDate,
        type: 'Invoice',
        customer: inv.customerDetails?.name || 'Unknown',
        amount: inv.amountPaid || 0, // Using amountPaid as requested
        status: inv.status,
        reference: inv.invoiceNumber
      })),
      ...expenses.map(exp => ({
        date: exp.date,
        type: 'Expense',
        customer: exp.title,
        amount: exp.amount || 0,
        status: exp.status,
        reference: exp.title
      }))
    ];

    // Sort combined transactions globally
    const direction = sortDirection === 'desc' ? -1 : 1;
    allTransactions.sort((a, b) => {
      let aVal = a[sort];
      let bVal = b[sort];

      if (sort === 'date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (aVal < bVal) return -1 * direction;
      if (aVal > bVal) return 1 * direction;
      return 0;
    });

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const totalCount = allTransactions.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedTransactions = allTransactions.slice(startIndex, startIndex + limitNum);

    // Format for response
    const formattedTransactions = paginatedTransactions.map(t => ({
      ...t,
      date: t.date instanceof Date ? t.date.toISOString().split('T')[0] : t.date
    }));

    const pagination = {
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      limit: limitNum
    };

    const result = {
      data: formattedTransactions,
      pagination
    };

    successResponse(res, 'Detailed transactions retrieved', result);

  } catch (error) {
    errorResponse(res, error.message, 500);
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

    const invoiceMatch = Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {};
    const expenseMatch = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const [
      revenueData,
      posRevenueData,
      expenseData,
      totalInvoices,
      totalCustomers
    ] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            ...invoiceMatch,
            status: { $nin: ['draft', 'cancelled'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      SalesReceipt.aggregate([
        {
          $match: {
            receiptDate: dateFilter,
            source: 'pos',
            status: 'completed',
            invoice: null
          }
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Expense.aggregate([
        { $match: { ...expenseMatch, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Invoice.countDocuments({ ...invoiceMatch, status: { $nin: ['draft', 'cancelled'] } }),
      Customer.countDocuments()
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

    const query = {
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
    const customers = await Customer.find()
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

    const invoiceMatch = Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {};

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
    // FIX ISSUE #2: Only include invoices that are actually outstanding
    // Exclude: draft (not sent), paid (collected), cancelled (voided)
    const agingReport = await Invoice.find({
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
      balanceDue: { $gt: 0.01 }  // Extra safety for floating-point
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

    const query = { status: 'paid' };
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
exports.getProfitLossReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const invoiceMatch = Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {};
    const expenseMatch = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const [revenueData, expenseData] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            ...invoiceMatch,
            status: { $nin: ['draft', 'cancelled'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } }
      ]),
      Expense.aggregate([
        { $match: { ...expenseMatch, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalRevenue = revenueData[0]?.total || 0;
    const totalExpenses = expenseData[0]?.total || 0;
    const profit = totalRevenue - totalExpenses;

    const profitLossReport = {
      totalRevenue,
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

    let dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
    }

    let data;
    const query = {};
    if (Object.keys(dateFilter).length > 0) query[type === 'sales' ? 'invoiceDate' : 'date'] = dateFilter;

    switch (type) {
      case 'sales':
        data = await Invoice.find(query).populate('customer', 'fullName');
        break;
      case 'expenses':
        const expenseQuery = { ...query, status: 'paid' };
        data = await Expense.find(expenseQuery);
        break;
      case 'customers':
        data = await Customer.find();
        break;
      default:
        return errorResponse(res, 'Invalid export type', 400);
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

    const invoiceMatch = Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {};

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

    const invoiceMatch = Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {};

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

    // Get revenue from invoice payments grouped by payment method
    const invoiceRevenue = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: dateFilter,
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
          receiptDate: dateFilter,
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

    const velocityData = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: dateFilter,
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

    const stats = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: dateFilter,
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

    const expenseMatch = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

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
      { $match: { ...expenseMatch, status: 'paid' } },
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

    const expenseMatch = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

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

    const expenseMatch = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

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


