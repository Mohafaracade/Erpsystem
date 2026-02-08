const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

// Register (DISABLED - Use admin-only user creation instead)
// Public registration is disabled for security. Only super_admin can create companies and users.
// router.post('/register', authController.register);

// Login (rate limiting removed)
router.post('/login', authController.login);

// ✅ FIX #14: Add rate limiting to password reset
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.put('/reset-password/:token', passwordResetLimiter, authController.resetPassword);

// Get logged-in user profile
router.get('/me', protect, authController.getMe);

module.exports = router;
