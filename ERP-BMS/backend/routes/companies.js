const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/auth');
const { userCreationLimiter } = require('../middleware/rateLimiter'); // ✅ FIX #7: Rate limit company creation

// All routes require authentication
router.use(protect);

// Super admin only routes
router.route('/')
  .get(authorize('super_admin'), companyController.getAllCompanies)
  .post(userCreationLimiter, authorize('super_admin'), companyController.createCompany); // ✅ FIX #7: Rate limit company creation

// Company management routes
router.route('/:id')
  .get(companyController.getCompany) // Super admin or company admin (controller validates)
  .put(authorize('super_admin', 'company_admin'), companyController.updateCompany) // ✅ SECURITY FIX: Explicit route-level authorization
  .delete(authorize('super_admin'), companyController.deleteCompany);

// Company users management
router.post('/:id/users', companyController.createCompanyUser); // Super admin or company admin
router.get('/:id/users', companyController.getCompanyUsers); // Super admin or company admin

// Company statistics
router.get('/:id/stats', companyController.getCompanyStats); // Super admin or company admin

module.exports = router;

