const { body, validationResult } = require('express-validator');

// Common validation middleware
exports.validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.errors.length) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  };
};

// User validations
exports.userValidation = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),

    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Valid email is required'),

    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    body('role')
      .optional()
      .isIn(['admin', 'accountant', 'staff']).withMessage('Invalid role')
  ],

  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Valid email is required'),

    body('password')
      .notEmpty().withMessage('Password is required')
  ]
};

// Customer validations
exports.customerValidation = {
  create: [
    body('customerType')
      .notEmpty().withMessage('Customer type is required')
      .isIn(['individual', 'business']).withMessage('Must be individual or business'),

    body('fullName')
      .trim()
      .notEmpty().withMessage('Full name is required')
      .isLength({ min: 2, max: 200 }).withMessage('Full name must be 2-200 characters'),

    body('phone')
      .notEmpty().withMessage('Phone number is required')
      .matches(/^[\d\s\-\+\(\)]{10,}$/).withMessage('Valid phone number is required')
  ]
};

// Item validations
exports.itemValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty().withMessage('Item name is required')
      .isLength({ min: 2, max: 200 }).withMessage('Item name must be 2-200 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

    body('type')
      .optional()
      .isIn(['Goods', 'Service']).withMessage('Type must be Goods or Service')
      .default('Goods'),

    body('sellingPrice')
      .notEmpty().withMessage('Selling price is required')
      .isFloat({ min: 0.01 }).withMessage('Selling price must be greater than 0'),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive must be a boolean')
  ],

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 200 }).withMessage('Item name must be 2-200 characters'),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),

    body('type')
      .optional()
      .isIn(['Goods', 'Service']).withMessage('Type must be Goods or Service'),

    body('sellingPrice')
      .optional()
      .isFloat({ min: 0.01 }).withMessage('Selling price must be greater than 0'),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive must be a boolean')
  ]
};

// Invoice validations
exports.invoiceValidation = {
  create: [
    body('customer')
      .notEmpty().withMessage('Customer is required'),

    body('invoiceDate')
      .notEmpty().withMessage('Invoice date is required')
      .isISO8601().withMessage('Valid date is required'),

    body('dueDate')
      .notEmpty().withMessage('Due date is required')
      .isISO8601().withMessage('Valid date is required'),

    body('items')
      .isArray({ min: 1 }).withMessage('At least one item is required'),

    body('items.*.item')
      .notEmpty().withMessage('Item ID is required'),

    body('items.*.quantity')
      .notEmpty().withMessage('Quantity is required')
      .isFloat({ min: 0.01 }).withMessage('Quantity must be greater than 0'),

    body('items.*.rate')
      .notEmpty().withMessage('Rate is required')
      .isFloat({ min: 0 }).withMessage('Rate cannot be negative'),

    body('subTotal')
      .isFloat({ min: 0 }).withMessage('Subtotal must be positive'),

    body('total')
      .isFloat({ min: 0 }).withMessage('Total must be positive')
  ],

  recordPayment: [
    body('amount')
      .notEmpty().withMessage('Amount is required')
      .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),

    body('paymentMethod')
      .optional()
      .trim()
      .notEmpty().withMessage('Payment method cannot be empty if provided'),

    body('paymentDate')
      .optional()
      .isISO8601().withMessage('Valid payment date is required')
  ]
};