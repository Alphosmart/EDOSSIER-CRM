const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const CommissionPayout = require('../models/CommissionPayout');

// Helper: filter leads by user role
const filterLeadsByRole = (user) => {
  switch (user.role) {
    case 'sales_rep':
      return { assignedTo: user._id };
    case 'team_lead':
      return { territory: user.territory };
    case 'manager':
    case 'admin':
      return {};
    default:
      return { assignedTo: user._id };
  }
};

// @desc    Get all leads (filtered by role)
// @route   GET /api/leads
// @access  Private
exports.getLeads = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);

    // Query params for filtering
    const { status, territory, search, page = 1, limit = 50 } = req.query;

    if (status) filter.currentStatus = status;
    if (territory) filter.territory = territory;
    if (search) {
      filter.$or = [
        { schoolName: { $regex: search, $options: 'i' } },
        { schoolId: { $regex: search, $options: 'i' } },
        { personMet: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'firstName lastName email territory')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Lead.countDocuments(filter)
    ]);

    res.json({
      leads,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single lead
// @route   GET /api/leads/:id
// @access  Private
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email territory');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check access
    if (req.user.role === 'sales_rep' && !lead.assignedTo._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this lead' });
    }
    if (req.user.role === 'team_lead' && lead.territory !== req.user.territory) {
      return res.status(403).json({ message: 'Not authorized to view this lead' });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new lead
// @route   POST /api/leads
// @access  Private
exports.createLead = async (req, res) => {
  try {
    const leadData = { ...req.body };

    // Default assignment to current user if not specified
    if (!leadData.assignedTo) {
      leadData.assignedTo = req.user._id;
    }

    // Default territory from user if not set
    if (!leadData.territory && req.user.territory) {
      leadData.territory = req.user.territory;
    }

    // Default commission rate from user
    if (!leadData.commissionPercentage) {
      leadData.commissionPercentage = req.user.defaultCommissionRate;
    }

    const lead = await Lead.create(leadData);

    // Log activity
    await Activity.create({
      leadId: lead._id,
      userId: req.user._id,
      activityType: 'Note Added',
      description: `Lead created: ${lead.schoolName}`,
      outcome: 'New lead added to pipeline'
    });

    const populatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'firstName lastName email territory');

    res.status(201).json(populatedLead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update lead
// @route   PUT /api/leads/:id
// @access  Private
exports.updateLead = async (req, res) => {
  try {
    let lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check authorization
    if (req.user.role === 'sales_rep' && !lead.assignedTo.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to edit this lead' });
    }
    if (req.user.role === 'team_lead' && lead.territory !== req.user.territory) {
      return res.status(403).json({ message: 'Not authorized to edit this lead' });
    }

    const previousStatus = lead.currentStatus;

    // Commission % — admin only
    const adminOnlyFields = ['commissionPercentage'];
    // Financial / assignment — admin or manager
    const adminOrManagerFields = ['paymentStatus', 'amountPaid', 'assignedTo'];

    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key === '_id' || key === 'schoolId') return;
      if (adminOnlyFields.includes(key) && req.user.role !== 'admin') return;
      if (adminOrManagerFields.includes(key) && !['admin', 'manager'].includes(req.user.role)) return;
      lead[key] = req.body[key];
    });

    await lead.save();

    // If status changed to Closed Won, create commission payout
    if (previousStatus !== 'Closed Won' && lead.currentStatus === 'Closed Won') {
      lead.actualClosingDate = lead.actualClosingDate || new Date();
      await lead.save();

      await CommissionPayout.create({
        userId: lead.assignedTo,
        leadId: lead._id,
        dealAmount: lead.negotiatedPrice,
        commissionPercentage: lead.commissionPercentage,
        commissionAmount: lead.commissionAmount
      });

      // Log status change
      await Activity.create({
        leadId: lead._id,
        userId: req.user._id,
        activityType: 'Status Change',
        description: `Deal closed: ${lead.schoolName} - ₦${lead.negotiatedPrice?.toLocaleString()}`,
        outcome: 'Closed Won'
      });
    } else if (previousStatus !== lead.currentStatus) {
      await Activity.create({
        leadId: lead._id,
        userId: req.user._id,
        activityType: 'Status Change',
        description: `Status changed from ${previousStatus} to ${lead.currentStatus}`,
        outcome: lead.currentStatus
      });
    }

    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'firstName lastName email territory');

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update lead status
// @route   PUT /api/leads/:id/status
// @access  Private
exports.updateLeadStatus = async (req, res) => {
  try {
    req.body = { currentStatus: req.body.status || req.body.currentStatus };
    return exports.updateLead(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete lead (soft delete)
// @route   DELETE /api/leads/:id
// @access  Manager/Admin
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    lead.isDeleted = true;
    await lead.save();

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get overdue follow-ups
// @route   GET /api/leads/overdue
// @access  Private
exports.getOverdueLeads = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);
    filter.nextFollowUpDate = { $lt: new Date() };
    filter.currentStatus = {
      $nin: ['Closed Won', 'Closed Lost', 'Not Interested']
    };

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .sort({ nextFollowUpDate: 1 });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get today's follow-ups
// @route   GET /api/leads/today
// @access  Private
exports.getTodayLeads = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    filter.nextFollowUpDate = { $gte: today, $lt: tomorrow };
    filter.currentStatus = {
      $nin: ['Closed Won', 'Closed Lost', 'Not Interested']
    };

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .sort({ nextFollowUpDate: 1 });

    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
