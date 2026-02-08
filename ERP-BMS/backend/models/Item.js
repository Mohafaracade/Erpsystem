const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Item type is required'],
    enum: ['Goods', 'Service'],
    default: 'Goods'
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [200, 'Item name cannot be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  sellingPrice: {
    type: Number,
    required: [true, 'Selling price is required'],
    min: [0, 'Selling price cannot be negative']
  },
  // ✅ CRITICAL FIX: Inventory/Stock Management
  stockQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Stock quantity cannot be negative'],
    required: function() { return this.type === 'Goods'; } // Required for Goods, optional for Services
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: [0, 'Low stock threshold cannot be negative']
  },
  trackInventory: {
    type: Boolean,
    default: true // Track inventory by default for Goods
  },
  isActive: {
    type: Boolean,
    default: true
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
  }
}, {
  timestamps: true
});

// Indexes
itemSchema.index({ name: 'text', description: 'text' });
itemSchema.index({ isActive: 1 });
itemSchema.index({ company: 1, isActive: 1 });
itemSchema.index({ createdBy: 1 });

const Item = mongoose.model('Item', itemSchema);

module.exports = Item;