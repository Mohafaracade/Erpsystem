const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

// Register (PUBLIC)
router.post('/register', authController.register);

// Login (PUBLIC)
router.post('/login', authController.login);

// Get logged-in user profile
router.get('/me', protect, authController.getMe);

module.exports = router;
