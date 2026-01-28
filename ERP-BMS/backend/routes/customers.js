const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

// All routes protected
router.use(protect);

// Customer routes
router.route('/')
  .get(customerController.getAllCustomers)
  .post(customerController.createCustomer);

router.route('/:id')
  .get(customerController.getCustomer)
  .put(customerController.updateCustomer)
  .delete(authorize('admin'), customerController.deleteCustomer);

// Additional routes
router.get('/stats/overview', customerController.getCustomerStats);
router.get('/export/csv', customerController.exportCustomers);

module.exports = router;