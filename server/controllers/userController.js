const User = require('../models/User');
const Lead = require('../models/Lead');

// @desc    Get all users
// @route   GET /api/users
// @access  Admin/Manager
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Admin/Manager
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Admin
exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, whatsapp, role, territory, defaultCommissionRate, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    user.phone = phone !== undefined ? phone : user.phone;
    user.whatsapp = whatsapp !== undefined ? whatsapp : user.whatsapp;
    user.role = role || user.role;
    user.territory = territory || user.territory;
    user.defaultCommissionRate = defaultCommissionRate !== undefined ? defaultCommissionRate : user.defaultCommissionRate;
    user.isActive = isActive !== undefined ? isActive : user.isActive;
    user.updatedAt = Date.now();

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Deactivate user
// @route   DELETE /api/users/:id
// @access  Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = false;
    user.updatedAt = Date.now();
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user performance
// @route   GET /api/users/:id/performance
// @access  Admin/Manager/Self
exports.getUserPerformance = async (req, res) => {
  try {
    const userId = req.params.id;
    const leads = await Lead.find({ assignedTo: userId });

    const closedWon = leads.filter(l => l.currentStatus === 'Closed Won');
    const closedLost = leads.filter(l => l.currentStatus === 'Closed Lost');
    const activeLeads = leads.filter(l =>
      !['Closed Won', 'Closed Lost', 'Not Interested'].includes(l.currentStatus)
    );

    const totalRevenue = closedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0);
    const totalCommission = closedWon.reduce((sum, l) => sum + (l.commissionAmount || 0), 0);
    const totalClosed = closedWon.length + closedLost.length;
    const winRate = totalClosed > 0 ? (closedWon.length / totalClosed) * 100 : 0;

    const pipelineValue = activeLeads.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0);
    const weightedForecast = activeLeads.reduce((sum, l) => {
      return sum + ((l.negotiatedPrice || 0) * ((l.probabilityOfClosing || 0) / 100));
    }, 0);

    res.json({
      totalLeads: leads.length,
      activeLeads: activeLeads.length,
      closedWon: closedWon.length,
      closedLost: closedLost.length,
      winRate: Math.round(winRate * 100) / 100,
      totalRevenue,
      totalCommission,
      pipelineValue,
      weightedForecast
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
