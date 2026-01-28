const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  customerType: {
    type: String,
    enum: ['individual', 'business'],
    required: [true, 'Customer type is required'],
    default: 'individual'
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [200, 'Full name cannot be more than 200 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },
  email: {
    type: String,
    match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please provide a valid email'],
    lowercase: true,
    trim: true
  },
  address: {
    type: String,
    maxlength: [300, 'Address cannot be more than 300 characters'],
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
customerSchema.index({ fullName: 'text', phone: 'text' });
customerSchema.index({ customerType: 1 });
customerSchema.index({ status: 1 });
customerSchema.index({ createdBy: 1 });

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;