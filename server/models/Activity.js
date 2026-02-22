const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  activityType: {
    type: String,
    enum: ['Call', 'Email', 'WhatsApp', 'Visit', 'Demo', 'Proposal Sent', 'Status Change', 'Note Added']
  },
  description: { type: String },
  outcome: { type: String },
  nextAction: { type: String },
  // Scheduled next follow-up for this interaction
  followUpDate: { type: Date },
  followUpMethod: {
    type: String,
    enum: ['Call', 'WhatsApp', 'Email', 'Physical Visit']
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', ActivitySchema);
