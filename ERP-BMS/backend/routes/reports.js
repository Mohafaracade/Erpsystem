const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// All routes protected and restricted to Admin/Accountant only
router.use(protect, authorize('admin', 'accountant'));

// Dashboard overview
router.get('/dashboard', reportController.getDashboardOverview);

// Comprehensive reports (single endpoint for all data)
router.get('/comprehensive', reportController.getComprehensiveReports);

// Chart data endpoints
router.get('/revenue-trend', reportController.getRevenueTrend);
router.get('/monthly-sales', reportController.getMonthlySales);
router.get('/expenses-by-category', reportController.getExpensesByCategory);
router.get('/top-customers', reportController.getTopCustomers);
router.get('/invoice-status', reportController.getInvoiceStatusDistribution);

// Revenue analysis endpoints
router.get('/revenue-by-payment-method', reportController.getRevenueByPaymentMethod);
router.get('/payment-velocity', reportController.getPaymentVelocity);
router.get('/collection-rate', reportController.getCollectionRate);

// Expense analysis endpoints
router.get('/expense-trend', reportController.getExpenseTrend);
router.get('/top-vendors', reportController.getTopVendors);
router.get('/expense-metrics', reportController.getExpenseMetrics);

// Detailed transactions with pagination
router.get('/transactions', reportController.getDetailedTransactions);

// Sales reports
router.get('/sales', reportController.getSalesReport);
router.get('/customers', reportController.getCustomerReport);
router.get('/items', reportController.getItemSalesReport);
router.get('/aging', reportController.getAgingReport);

// Expense reports
router.get('/expenses', reportController.getExpenseReport);
router.get('/profit-loss', reportController.getProfitLossReport);

// Export reports
router.get('/export/:type', reportController.exportReport);

module.exports = router;