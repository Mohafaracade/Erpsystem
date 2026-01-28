const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
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
  }
});

const invoiceSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    customerDetails: {
      name: String,
      phone: String
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true
    },
    invoiceDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true
    },
    terms: String,
    items: [invoiceItemSchema],
    subTotal: {
      type: Number,
      required: true,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    shippingCharges: {
      type: Number,
      default: 0,
      min: 0
    },
    taxTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    balanceDue: {
      type: Number,
      min: 0
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'partially_paid'],
      default: 'draft'
    },
    // FIX ISSUE #5: Track if partially paid invoices are past due
    // Helps collection team prioritize urgent vs patient partially-paid invoices
    overdueFlag: {
      type: Boolean,
      default: false
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
    sentDate: Date,
    paidDate: Date,
    cancelledDate: Date
    ,
    receipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalesReceipt',
      default: null
    },
    payments: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now },
        method: { type: String, enum: ['cash', 'credit_card', 'bank_transfer', 'cheque', 'online', 'other'], default: 'cash' },
        reference: String,
        note: String,
        receipt: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesReceipt' }
      }
    ]
  },
  { timestamps: true }
);

// Auto calculate balance & status
invoiceSchema.pre('save', function (next) {
  // 1. Force recalculate amountPaid from payments array to ensure consistency
  if (this.payments && this.payments.length > 0) {
    this.amountPaid = this.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  } else {
    this.amountPaid = Number(this.amountPaid) || 0;
  }

  // 2. Ensure totals are valid numbers
  this.total = Number(this.total) || 0;
  this.amountPaid = Number(this.amountPaid) || 0;

  // 3. Calculate balance due
  this.balanceDue = Math.max(0, this.total - this.amountPaid);

  // 4. Status Logic - Strict and Correct
  // IMPORTANT: Only auto-calculate status for non-draft invoices
  // Draft invoices stay draft until explicitly sent

  // If invoice is cancelled and still has balance, keep it cancelled
  // Only exception: if fully paid, mark as paid (business rule)
  if (this.status === 'cancelled') {
    if (this.balanceDue <= 0.01 && this.total > 0) {
      this.status = 'paid';
      this.paidDate = this.paidDate || new Date();
    }
    // Otherwise stay cancelled
    return next();
  }

  // Draft invoices stay draft - no auto-status changes
  // User must explicitly send the invoice
  if (this.status === 'draft') {
    return next();
  }

  // Auto-calculate status for active invoices (sent, partially_paid, overdue, paid)
  if (this.balanceDue <= 0.01 && this.total > 0) {
    // Fully paid
    this.status = 'paid';
    this.paidDate = this.paidDate || new Date();
  } else if (this.amountPaid > 0) {
    // Has payments but not fully paid
    this.status = 'partially_paid';
  } else if (new Date() > this.dueDate) {
    // No payments and past due date
    this.status = 'overdue';
    this.sentDate = this.sentDate || new Date(); // If it's overdue, it must have been sent
  } else {
    // Active invoice, no payments, not overdue
    this.status = 'sent';
    this.sentDate = this.sentDate || new Date();
  }

  // FIX ISSUE #5: Calculate overdueFlag for collection prioritization
  // Set flag if invoice is past due and has outstanding balance
  if (new Date() > this.dueDate && this.balanceDue > 0.01) {
    this.overdueFlag = true;
  } else {
    this.overdueFlag = false;
  }

  next();
});

// Indexes (NO DUPLICATES)
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
