const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const { protect, authorize } = require('../middleware/auth');

// All routes protected
router.use(protect);


router.route('/')
  .get(receiptController.getAllReceipts)
  .post(receiptController.createReceipt);

router.route('/:id')
  .get(receiptController.getReceipt)
  .put(receiptController.updateReceipt)
  .delete(authorize('admin'), receiptController.deleteReceipt);

// Additional routes
router.get('/:id/download', receiptController.downloadReceipt);
router.get('/stats/overview', receiptController.getReceiptStats);
router.get('/export/csv', receiptController.exportReceipts);

module.exports = router;