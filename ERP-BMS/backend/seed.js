const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item is required']
  },
  itemDetails: {
    name: String,
    description: String,
    type: String,
    sellingPrice: Number
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
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
  },
  { timestamps: true }
);

// Auto calculate balance & status
invoiceSchema.pre('save', function (next) {
  this.balanceDue = this.total - this.amountPaid;

  if (this.balanceDue <= 0) {
    this.status = 'paid';
    this.paidDate ||= new Date();
  } else if (this.amountPaid > 0) {
    this.status = 'partially_paid';
  } else if (new Date() > this.dueDate) {
    this.status = 'overdue';
  }

  next();
});

// Indexes (NO DUPLICATES)
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
