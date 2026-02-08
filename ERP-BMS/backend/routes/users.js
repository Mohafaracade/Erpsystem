const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { userCreationLimiter } = require('../middleware/rateLimiter');

/*
|--------------------------------------------------------------------------
| User Management Routes (ADMIN ONLY)
|--------------------------------------------------------------------------
| All routes below require:
| - Valid JWT Token
| - Admin Role
|--------------------------------------------------------------------------
*/

// Apply auth middleware to all routes
// ✅ SECURITY FIX: Only super_admin and company_admin can manage users
// admin role is NOT allowed to manage users (strict role separation)
router.use(protect, authorize('super_admin', 'company_admin'));

// Get all users / Create new user
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userCreationLimiter, userController.createUser); // ✅ FIX #14: Rate limit user creation

// Get / Update / Delete single user
router
  .route('/:id')
  .get(userController.getUser)
  .put(userController.updateUser)
  .delete(userController.deleteUser);

// User activity by user ID
router.get('/:id/activity', userController.getUserActivity);

// System-wide activity logs
router.get('/activity/system', userController.getSystemActivity);

// Export activity logs
router.get('/activity/export', userController.exportActivityLogs);

// User statistics overview
router.get('/stats/overview', userController.getUserStats);

module.exports = router;
