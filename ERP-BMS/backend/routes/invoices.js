const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/auth');
const { validate, invoiceValidation } = require('../utils/validators');

// All routes protected
router.use(protect);

// ✅ SPECIFIC ROUTES FIRST (before /:id catch-all)
// These must come before parameterized routes to avoid route shadowing
router.get('/unpaid', invoiceController.getUnpaidInvoicesByCustomer);
router.post('/check-duplicate', invoiceController.checkDuplicateInvoice);
router.get('/stats/overview', invoiceController.getInvoiceStats);
router.get('/export/csv', invoiceController.exportInvoices);

// General CRUD
router.route('/')
  .get(invoiceController.getAllInvoices)
  .post(validate(invoiceValidation.create), invoiceController.createInvoice);

// /:id sub-routes (still before general /:id)
router.patch('/:id/send', invoiceController.markAsSent);
router.post('/:id/payments',
  authorize('admin', 'accountant'),
  validate(invoiceValidation.recordPayment),
  invoiceController.recordPayment
);
router.get('/:id/pdf', invoiceController.downloadInvoice);

// ✅ PARAMETERIZED CATCH-ALL ROUTES LAST
router.route('/:id')
  .get(invoiceController.getInvoice)
  .put(validate(invoiceValidation.create), invoiceController.updateInvoice)
  .delete(authorize('admin'), invoiceController.deleteInvoice);

module.exports = router;