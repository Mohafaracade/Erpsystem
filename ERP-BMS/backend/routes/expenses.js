const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');
const { uploadFiles } = require('../middleware/upload');
const { checkStorageLimit } = require('../middleware/storageLimit');

// All routes protected
router.use(protect);

// Additional routes (must be defined before '/:id')
router.get('/stats/overview', expenseController.getExpenseStats);
router.get('/export/csv', expenseController.exportExpenses);
router.put(
  '/:id/status',
  authorize('admin', 'company_admin', 'super_admin'), // ✅ FIX #8: Include all admin roles
  expenseController.updateExpenseStatus
);
router.get(
  '/:id/attachments/:attachmentId',
  expenseController.downloadAttachment
);

router.route('/')
  .get(expenseController.getAllExpenses)
  .post(
    checkStorageLimit, // ✅ FIX #19: Check storage limit before upload
    uploadFiles('attachments', 5), 
    expenseController.createExpense
  );

router.route('/:id')
  .get(expenseController.getExpense)
  .put(
    checkStorageLimit, // ✅ FIX #19: Check storage limit before upload
    uploadFiles('attachments', 5), 
    expenseController.updateExpense
  )
  .delete(authorize('admin'), expenseController.deleteExpense);

module.exports = router;