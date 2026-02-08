const mongoose = require('mongoose');

const receiptItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item is required']
  },
  itemDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  rate: {
    type: Number,
    required: [true, 'Rate is required'],
    min: [0, 'Rate cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  }
});

const salesReceiptSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false // Optional for walk-in sales
  },
  source: {
    type: String,
    enum: ['pos'],
    default: 'pos'
  },
  customerDetails: {
    name: String,
    phone: String
  },
  salesReceiptNumber: {
    type: String,
    required: [true, 'Sales receipt number is required'],
    uppercase: true
    // Uniqueness enforced via compound index with company
  },
  receiptDate: {
    type: Date,
    required: [true, 'Receipt date is required'],
    default: Date.now
  },
  items: [receiptItemSchema],
  subTotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  shippingCharges: {
    type: Number,
    default: 0,
    min: [0, 'Shipping charges cannot be negative']
  },
  taxTotal: {
    type: Number,
    default: 0,
    min: [0, 'Tax total cannot be negative']
  },
  total: {
    type: Number,
    required: [true, 'Total is required'],
    min: [0, 'Total cannot be negative']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit_card', 'bank_transfer', 'cheque', 'online', 'other'],
    default: 'cash'
  },
  paymentReference: {
    type: String
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String,
    size: Number
  }],
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'refunded'],
    default: 'completed'
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // CRITICAL: Link to invoice for payment-linked receipts
  // Used by reportController to exclude from revenue (prevent double-counting)
  // NULL for standalone POS transactions (these count toward revenue)
  // SET for invoice payment receipts (these are excluded from revenue)
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    default: null,
    index: true  // Optimize revenue queries
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
salesReceiptSchema.index({ company: 1, salesReceiptNumber: 1 }, { unique: true });
salesReceiptSchema.index({ customer: 1 });
salesReceiptSchema.index({ company: 1, receiptDate: -1 });
salesReceiptSchema.index({ company: 1, status: 1 });
salesReceiptSchema.index({ paymentMethod: 1 });
salesReceiptSchema.index({ createdBy: 1 });

const SalesReceipt = mongoose.model('SalesReceipt', salesReceiptSchema);

module.exports = SalesReceipt;