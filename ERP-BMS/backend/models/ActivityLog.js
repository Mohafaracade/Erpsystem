const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: false, // Optional for super_admin who don't have a company
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['super_admin', 'company_admin', 'admin', 'accountant', 'staff'],
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'create', 'update', 'delete', 'view',
      'download', 'export', 'import', 'approve', 'reject',
      'password_change', 'password_reset',
      'payment_recorded', 'payment_received', 'payment_refunded'
    ]
  },
  entityType: {
    type: String,
    enum: [
      'user', 'customer', 'item', 'invoice', 'receipt',
      'expense', 'report', 'system'
    ],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.Mixed
  },
  entityName: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ company: 1, timestamp: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ userRole: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;