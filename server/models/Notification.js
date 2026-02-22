const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:     { type: String, enum: ['commission', 'lead', 'system', 'follow_up'], default: 'system' },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  link:     { type: String },          // client-side route to navigate to
  read:     { type: Boolean, default: false, index: true },
  createdAt:{ type: Date, default: Date.now }
});

// Auto-expire after 60 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', NotificationSchema);
