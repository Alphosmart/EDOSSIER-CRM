const Activity = require('../models/Activity');

// @desc    Get activities for a lead
// @route   GET /api/activities/:leadId
// @access  Private
exports.getActivities = async (req, res) => {
  try {
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
    const activityData = {
      ...req.body,
      userId: req.user._id
    };

    const activity = await Activity.create(activityData);

    const populated = await Activity.findById(activity._id)
      .populate('userId', 'firstName lastName');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
