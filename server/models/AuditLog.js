const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String },
  action: { type: String, required: true }, // CREATE, UPDATE, DELETE, LOGIN, DISBURSE, etc.
  resource: { type: String, required: true }, // Lead, User, CommissionPayout, etc.
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  changes: { type: mongoose.Schema.Types.Mixed }, // { field: { from, to } }
  ip: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: false });

// Index for fast lookups
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1 });
AuditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
