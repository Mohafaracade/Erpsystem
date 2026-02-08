const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and super_admin role
router.use(protect, authorize('super_admin'));

// Dashboard Statistics
router.get('/dashboard', superAdminController.getDashboardStats);

// Companies Management (Super Admin has full control)
router.route('/companies')
  .get(superAdminController.getAllCompanies)
  .post(superAdminController.createCompany);

router.route('/companies/:id')
  .get(superAdminController.getCompany)
  .put(superAdminController.updateCompany)
  .delete(superAdminController.deleteCompany);

// Users Management (Global - across all companies)
router.route('/users')
  .get(superAdminController.getAllUsers)
  .post(superAdminController.createUser);

router.route('/users/:id')
  .get(superAdminController.getUser)
  .put(superAdminController.updateUser)
  .delete(superAdminController.deleteUser);

// Subscriptions Management
router.get('/subscriptions', superAdminController.getAllSubscriptions);
router.put('/subscriptions/:companyId', superAdminController.updateSubscription);

// Global Reports
router.get('/reports', superAdminController.getGlobalReports);

// Audit Logs
router.get('/audit-logs', superAdminController.getAuditLogs);

// System Settings
router.route('/settings')
  .get(superAdminController.getSystemSettings)
  .put(superAdminController.updateSystemSettings);

module.exports = router;

