const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');
const { exportLimiter } = require('../middleware/rateLimiter');

// All routes protected
router.use(protect);

// ✅ FIX #6: Restrict accountant access to financial reports only
// Accountant can only access financial reports, not system reports
// Admin, company_admin, and super_admin have full access

// ✅ FIX #6: Financial reports (accessible to accountant)
router.get('/dashboard', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getDashboardOverview);
router.get('/revenue-trend', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getRevenueTrend);
router.get('/monthly-sales', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getMonthlySales);
router.get('/expenses-by-category', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getExpensesByCategory);
router.get('/revenue-by-payment-method', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getRevenueByPaymentMethod);
router.get('/payment-velocity', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getPaymentVelocity);
router.get('/collection-rate', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getCollectionRate);
router.get('/expense-trend', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getExpenseTrend);
router.get('/top-vendors', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getTopVendors);
router.get('/expense-metrics', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getExpenseMetrics);
router.get('/sales', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getSalesReport);
router.get('/expenses', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getExpenseReport);
router.get('/profit-loss', authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.getProfitLossReport);

// ✅ FIX #6: System reports (admin only, no accountant access)
router.get('/comprehensive', authorize('super_admin', 'company_admin', 'admin'), reportController.getComprehensiveReports);
router.get('/top-customers', authorize('super_admin', 'company_admin', 'admin'), reportController.getTopCustomers);
router.get('/invoice-status', authorize('super_admin', 'company_admin', 'admin'), reportController.getInvoiceStatusDistribution);
router.get('/transactions', authorize('super_admin', 'company_admin', 'admin'), reportController.getDetailedTransactions);
router.get('/customers', authorize('super_admin', 'company_admin', 'admin'), reportController.getCustomerReport);
router.get('/items', authorize('super_admin', 'company_admin', 'admin'), reportController.getItemSalesReport);
router.get('/aging', authorize('super_admin', 'company_admin', 'admin'), reportController.getAgingReport);

// ✅ FIX #29: Export reports with rate limiting
router.get('/export/:type', exportLimiter, authorize('super_admin', 'company_admin', 'admin', 'accountant'), reportController.exportReport);

module.exports = router;