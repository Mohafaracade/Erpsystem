const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { protect, authorize } = require('../middleware/auth');
const { validate, itemValidation } = require('../utils/validators');

// All routes protected
router.use(protect);

// Get all items or create new item
router.route('/')
  .get(itemController.getAllItems)
  .post(validate(itemValidation.create), itemController.createItem);

// Get, update, or delete a specific item
router.route('/:id')
  .get(itemController.getItem)
  .put(validate(itemValidation.update), itemController.updateItem)
  .delete(authorize('admin'), itemController.deleteItem);

// Toggle item status (active/inactive) - Admin only
router.patch('/:id/status', authorize('admin'), itemController.toggleItemStatus);

// Get item statistics
router.get('/stats/overview', itemController.getItemStats);

// Export items to CSV
router.get('/export/csv', itemController.exportItems);

module.exports = router;