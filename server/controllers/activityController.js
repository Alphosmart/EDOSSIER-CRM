const Activity = require('../models/Activity');
const Lead = require('../models/Lead');

// Helper: verify a sales_rep is allowed to access a lead
const canAccessLead = async (user, leadId) => {
  if (['admin', 'manager'].includes(user.role)) return true;
  const lead = await Lead.findById(leadId).select('assignedTo createdBy territory');
  if (!lead) return false;
  if (user.role === 'team_lead') {
    return lead.territory === user.territory ||
      (lead.createdBy && lead.createdBy.equals(user._id));
  }
  // sales_rep — must be assigned rep OR the one who brought the lead
  return (lead.assignedTo && lead.assignedTo.equals(user._id)) ||
    (lead.createdBy && lead.createdBy.equals(user._id));
};

// @desc    Get activities for a lead
// @route   GET /api/activities/:leadId
// @access  Private
exports.getActivities = async (req, res) => {
  try {
    const allowed = await canAccessLead(req.user, req.params.leadId);
    if (!allowed) {
      return res.status(403).json({ message: 'Not authorized to view activities for this lead' });
    }

    const activities = await Activity.find({ leadId: req.params.leadId })
      .populate('userId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Log new activity
// @route   POST /api/activities
// @access  Private
exports.createActivity = async (req, res) => {
  try {
    const { leadId } = req.body;
    if (leadId) {
      const allowed = await canAccessLead(req.user, leadId);
      if (!allowed) {
        return res.status(403).json({ message: 'Not authorized to log activity on this lead' });
      }
    }

    const activityData = {
      ...req.body,
      userId: req.user._id
    };

    const activity = await Activity.create(activityData);

    const populated = await Activity.findById(activity._id)
      .populate('userId', 'firstName lastName');

    // Auto-sync lead's next follow-up date whenever a follow-up is scheduled
    if (activityData.followUpDate && leadId) {
      const update = { nextFollowUpDate: activityData.followUpDate };
      if (activityData.followUpMethod) update.followUpMethod = activityData.followUpMethod;
      await Lead.findByIdAndUpdate(leadId, update);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
