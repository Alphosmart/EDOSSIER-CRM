const CommissionPayout = require('../models/CommissionPayout');

// Helper: filter by role
const filterByRole = (user) => {
  switch (user.role) {
    case 'sales_rep':
      return { userId: user._id };
    case 'team_lead':
    case 'manager':
    case 'admin':
      return {};
    default:
      return { userId: user._id };
  }
};

// @desc    Get all commissions (filtered by role)
// @route   GET /api/commissions
// @access  Private
exports.getCommissions = async (req, res) => {
  try {
    const filter = filterByRole(req.user);
    const { status } = req.query;
    if (status) filter.status = status;

    const commissions = await CommissionPayout.find(filter)
      .populate('userId', 'firstName lastName email territory')
      .populate('leadId', 'schoolName schoolId territory')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(commissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my commissions
// @route   GET /api/commissions/my
// @access  Private
exports.getMyCommissions = async (req, res) => {
  try {
    const commissions = await CommissionPayout.find({ userId: req.user._id })
      .populate('leadId', 'schoolName schoolId territory')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json(commissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve commission
// @route   PUT /api/commissions/:id/approve
// @access  Manager/Admin
exports.approveCommission = async (req, res) => {
  try {
    const commission = await CommissionPayout.findById(req.params.id);
    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    if (commission.status !== 'Pending') {
      return res.status(400).json({ message: 'Commission is not in Pending status' });
    }

    commission.status = 'Approved';
    commission.approvedBy = req.user._id;
    commission.approvedDate = new Date();
    await commission.save();

    const updated = await CommissionPayout.findById(commission._id)
      .populate('userId', 'firstName lastName email')
      .populate('leadId', 'schoolName schoolId')
      .populate('approvedBy', 'firstName lastName');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark commission as paid
// @route   PUT /api/commissions/:id/pay
// @access  Admin
exports.payCommission = async (req, res) => {
  try {
    const commission = await CommissionPayout.findById(req.params.id);
    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    if (commission.status !== 'Approved') {
      return res.status(400).json({ message: 'Commission must be approved before payment' });
    }

    commission.status = 'Paid';
    commission.paidDate = new Date();
    commission.paymentReference = req.body.paymentReference || '';
    await commission.save();

    const updated = await CommissionPayout.findById(commission._id)
      .populate('userId', 'firstName lastName email')
      .populate('leadId', 'schoolName schoolId')
      .populate('approvedBy', 'firstName lastName');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get commission summary
// @route   GET /api/commissions/summary
// @access  Private
exports.getCommissionSummary = async (req, res) => {
  try {
    const filter = filterByRole(req.user);
    const commissions = await CommissionPayout.find(filter);

    const pending = commissions.filter(c => c.status === 'Pending');
    const approved = commissions.filter(c => c.status === 'Approved');
    const paid = commissions.filter(c => c.status === 'Paid');

    res.json({
      totalCommissions: commissions.length,
      totalAmount: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      pending: {
        count: pending.length,
        amount: pending.reduce((sum, c) => sum + c.commissionAmount, 0)
      },
      approved: {
        count: approved.length,
        amount: approved.reduce((sum, c) => sum + c.commissionAmount, 0)
      },
      paid: {
        count: paid.length,
        amount: paid.reduce((sum, c) => sum + c.commissionAmount, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
