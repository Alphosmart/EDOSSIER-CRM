const User = require('../models/User');
const Lead = require('../models/Lead');
const { PERMISSIONS, getDefaultPermissions, getUserPermissions: getUserPermissionsUtil } = require('../utils/permissions');

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
    const { firstName, lastName, email, phone, whatsapp, role, country, territory, defaultCommissionRate, isActive, monthlyTarget } = req.body;

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
    user.country = country || user.country;
    user.territory = territory || user.territory;
    user.defaultCommissionRate = defaultCommissionRate !== undefined ? defaultCommissionRate : user.defaultCommissionRate;
    user.isActive = isActive !== undefined ? isActive : user.isActive;
    if (monthlyTarget !== undefined) user.monthlyTarget = monthlyTarget;
    
    // Reset permissions if role changes (optional - admin can override)
    if (role && role !== user.role) {
      user.permissions = getDefaultPermissions(role);
    }
    
    user.updatedAt = Date.now();

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set commission rate for a user
// @route   PATCH /api/users/:id/commission-rate
// @access  Admin
exports.setCommissionRate = async (req, res) => {
  try {
    const { defaultCommissionRate } = req.body;
    if (defaultCommissionRate === undefined || defaultCommissionRate < 0 || defaultCommissionRate > 100) {
      return res.status(400).json({ message: 'Rate must be between 0 and 100' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.defaultCommissionRate = defaultCommissionRate;
    user.updatedAt = Date.now();
    await user.save();

    res.json({ _id: user._id, defaultCommissionRate: user.defaultCommissionRate });
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
// @access  Admin/Manager/Self only
exports.getUserPerformance = async (req, res) => {
  try {
    // Sales reps may only view their own performance
    if (req.user.role === 'sales_rep' && req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view another user\'s performance' });
    }

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

// @desc    Get all available permissions
// @route   GET /api/users/permissions/available
// @access  Admin
exports.getAvailablePermissions = async (req, res) => {
  try {
    res.json(PERMISSIONS);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's permissions
// @route   GET /api/users/:id/permissions
// @access  Admin
exports.getUserPermissions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const permissions = getUserPermissionsUtil(user);
    res.json({
      role: user.role,
      customPermissions: user.permissions || [],
      allPermissions: permissions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user's permissions
// @route   PUT /api/users/:id/permissions
// @access  Admin
exports.updateUserPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    
    if (!Array.isArray(permissions)) {
      return res.status(400).json({ message: 'Permissions must be an array' });
    }
    
    // Validate all permissions are valid
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPermissions.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid permissions provided', 
        invalid: invalidPermissions 
      });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.permissions = permissions;
    user.updatedAt = Date.now();
    await user.save();
    
    res.json({
      message: 'Permissions updated successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
