const Notification = require('../models/Notification');
const Lead = require('../models/Lead');

// @desc  Get notifications for the logged-in user
// @route GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Mark one notification as read
// @route PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Mark all notifications as read
// @route PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Internal helper — call from other controllers
exports.createNotification = async (userId, type, title, message, link = '') => {
  try {
    await Notification.create({ userId, type, title, message, link });
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
};

// @desc  Admin/manager manually reminds a rep about a specific lead follow-up
// @route POST /api/leads/:id/remind
// @access admin, manager
exports.remindLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName _id');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (!lead.assignedTo) return res.status(400).json({ message: 'Lead has no assigned rep' });

    const dueStr = lead.nextFollowUpDate
      ? new Date(lead.nextFollowUpDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      : 'no date set';
    const sender = `${req.user.firstName} ${req.user.lastName}`;

    await Notification.create({
      userId: lead.assignedTo._id,
      type: 'follow_up',
      title: `📣 Reminder from ${sender}: ${lead.schoolName}`,
      message: `Follow-up required — ${lead.currentStatus}. Due: ${dueStr}${
        lead.followUpMethod ? ` via ${lead.followUpMethod}` : ''
      }`,
      link: `/leads/${lead._id}`
    });

    res.json({
      message: `Reminder sent to ${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`,
      repName: `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc  Admin/manager bulk-reminds all reps with overdue follow-ups
// @route POST /api/leads/remind-overdue
// @access admin, manager
exports.remindAllOverdue = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueLeads = await Lead.find({
      nextFollowUpDate: { $lt: today },
      currentStatus: { $nin: ['Closed Won', 'Closed Lost', 'Not Interested'] },
      isDeleted: { $ne: true }
    }).populate('assignedTo', 'firstName lastName _id');

    if (overdueLeads.length === 0) {
      return res.json({ message: 'No overdue leads found', repsNotified: 0 });
    }

    // Group by rep
    const repMap = {};
    overdueLeads.forEach(l => {
      if (!l.assignedTo) return;
      const uid = l.assignedTo._id.toString();
      if (!repMap[uid]) repMap[uid] = { rep: l.assignedTo, leads: [] };
      repMap[uid].leads.push(l);
    });

    const sender = `${req.user.firstName} ${req.user.lastName}`;
    let repsNotified = 0;

    for (const uid of Object.keys(repMap)) {
      const { rep, leads } = repMap[uid];
      const leadList = leads.slice(0, 5).map(l => l.schoolName).join(', ');
      const extra = leads.length > 5 ? ` +${leads.length - 5} more` : '';
      await Notification.create({
        userId: rep._id,
        type: 'follow_up',
        title: `⚠️ ${sender}: ${leads.length} overdue follow-up${leads.length > 1 ? 's' : ''}`,
        message: `Action needed: ${leadList}${extra}`,
        link: '/leads?status=overdue'
      });
      repsNotified++;
    }

    res.json({
      message: `Reminders sent to ${repsNotified} rep${repsNotified > 1 ? 's' : ''} for ${overdueLeads.length} overdue lead${overdueLeads.length > 1 ? 's' : ''}`,
      repsNotified,
      leadsCount: overdueLeads.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
