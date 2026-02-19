const Lead = require('../models/Lead');
const { filterLeadsByRole } = require('../utils/queryHelpers');

// @desc    Global search across leads
// @route   GET /api/search?q=...
// @access  Private
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ leads: [], contacts: [] });
    }

    const regex = { $regex: q.trim(), $options: 'i' };
    const roleFilter = filterLeadsByRole(req.user);

    const leads = await Lead.find({
      ...roleFilter,
      isDeleted: { $ne: true },
      $or: [
        { schoolName: regex },
        { schoolId: regex },
        { city: regex },
        { personMet: regex },
        { positionTitle: regex },
        { address: regex },
        { state: regex },
        { lga: regex }
      ]
    })
      .select('schoolName schoolId city state territory assignedTo currentStatus personMet')
      .populate('assignedTo', 'firstName lastName')
      .limit(10)
      .lean();

    // Separate contact results
    const contacts = await Lead.find({
      ...roleFilter,
      isDeleted: { $ne: true },
      $or: [
        { personMet: regex },
        { emailAddress: regex },
        { phoneNumber: regex }
      ]
    })
      .select('schoolName personMet positionTitle phoneNumber emailAddress')
      .limit(5)
      .lean();

    res.json({ leads, contacts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
