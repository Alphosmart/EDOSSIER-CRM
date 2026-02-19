const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  // School Information
  schoolId: { type: String, unique: true },
  schoolName: { type: String, required: [true, 'School name is required'], trim: true },
  schoolType: {
    type: String,
    enum: ['Private', 'Public', 'Primary', 'Secondary', 'Tertiary']
  },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  website: { type: String },
  numberOfStudents: { type: Number },

  // Visit Information
  dateVisited: { type: Date },
  timeVisited: { type: String },
  purposeOfVisit: { type: String },
  leadSource: { type: String },

  // Contact Information
  personMet: { type: String },
  positionTitle: { type: String },
  phoneNumber: { type: String },
  emailAddress: { type: String },
  whatsappNumber: { type: String },
  gatekeeperName: { type: String },

  // Pipeline Status
  currentStatus: {
    type: String,
    enum: [
      'Not Interested',
      'Interested',
      'Needs Proposal',
      'Needs Approval',
      'Demo Scheduled',
      'Proposal Sent',
      'Negotiation',
      'Closed Won',
      'Closed Lost'
    ],
    default: 'Interested'
  },
  responseSummary: { type: String },
  objectionsRaised: { type: String },

  // Follow-up Tracking
  nextFollowUpDate: { type: Date },
  followUpMethod: {
    type: String,
    enum: ['Call', 'WhatsApp', 'Email', 'Physical Visit']
  },
  nextMeetingScheduled: { type: Boolean, default: false },
  nextMeetingDate: { type: Date },
  reminderSet: { type: Boolean, default: false },

  // Pricing & Revenue
  proposedPackage: { type: String },
  proposedPrice: { type: Number, default: 0 },
  negotiatedPrice: { type: Number, default: 0 },
  expectedClosingDate: { type: Date },
  actualClosingDate: { type: Date },
  paymentStatus: {
    type: String,
    enum: ['Not Paid', 'Part Payment', 'Paid Fully'],
    default: 'Not Paid'
  },
  amountPaid: { type: Number, default: 0 },

  // Competitive Intelligence
  currentSystemUsed: { type: String },
  painPoints: { type: String },
  decisionTimeline: { type: String },
  competitorMentioned: { type: String },

  // Scoring & Probability
  relationshipStrength: { type: Number, min: 1, max: 5 },
  probabilityOfClosing: { type: Number, min: 0, max: 100 },

  // Commission
  commissionPercentage: { type: Number, default: 25, min: 0, max: 100 },
  commissionAmount: { type: Number, default: 0 },

  // Territory & Assignment (Nigerian state name)
  territory: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lga: { type: String },

  // Subscription & Recurring Revenue
  subscriptionType: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Bi-Annually', 'Annually', 'Custom'],
    default: null
  },
  subscriptionStartDate: { type: Date },
  renewalDate: { type: Date },
  subscriptionPlan: {
    type: String,
    enum: ['Free', 'Basic', 'Deluxe', 'Premium', 'Enterprise', 'Custom'],
    default: null
  },
  storageSize: {
    type: String,
    enum: ['5GB', '10GB', '25GB', '50GB', '100GB', 'Unlimited'],
    default: null
  },

  // Notes
  additionalNotes: { type: String },

  // File attachments
  attachments: [{
    filename: { type: String },
    originalName: { type: String },
    filePath: { type: String },
    fileSize: { type: Number },
    mimetype: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // Soft delete
  isDeleted: { type: Boolean, default: false },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
LeadSchema.index({ assignedTo: 1, currentStatus: 1 });
LeadSchema.index({ territory: 1 });
LeadSchema.index({ nextFollowUpDate: 1 });
LeadSchema.index({ schoolName: 'text', personMet: 'text', city: 'text', schoolId: 'text' });
LeadSchema.index({ createdAt: -1 });
LeadSchema.index({ isDeleted: 1 });

// Auto-generate schoolId
LeadSchema.pre('save', async function (next) {
  if (!this.schoolId) {
    const count = await mongoose.model('Lead').countDocuments();
    this.schoolId = `EDOS-${String(count + 1).padStart(4, '0')}`;
  }

  // Calculate commission on Closed Won
  if (this.currentStatus === 'Closed Won' && this.negotiatedPrice > 0) {
    this.commissionAmount = this.negotiatedPrice * (this.commissionPercentage / 100);
  } else {
    this.commissionAmount = 0;
  }

  this.updatedAt = Date.now();
  next();
});

// Exclude soft-deleted leads by default
LeadSchema.pre(/^find/, function (next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Lead', LeadSchema);
