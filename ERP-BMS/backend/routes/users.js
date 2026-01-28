const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

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
router.use(protect, authorize('admin'));

// Get all users / Create new user
router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

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
