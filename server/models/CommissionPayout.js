const mongoose = require('mongoose');

const CommissionPayoutSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
  dealAmount: { type: Number, required: true },
  commissionPercentage: { type: Number, required: true },
  commissionAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Disbursed', 'Paid'],
    default: 'Pending'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedDate: { type: Date },
  disbursedDate: { type: Date },
  disbursedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paymentReference: { type: String },
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedDate: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommissionPayout', CommissionPayoutSchema);
