const CommissionPayout = require('../models/CommissionPayout');
const { createNotification } = require('./notificationController');

// Helper: filter by role
const filterByRole = (user) => {
  switch (user.role) {
    case 'sales_rep':
      return { userId: user._id };
    case 'team_lead':
    case 'manager':
    case 'bursar':
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
      .populate('disbursedBy', 'firstName lastName')
      .populate('confirmedBy', 'firstName lastName')
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
      .populate('disbursedBy', 'firstName lastName')
      .populate('confirmedBy', 'firstName lastName')
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

    // Notify the rep
    createNotification(
      commission.userId,
      'commission',
      'Commission Approved ✓',
      `Your commission for ${updated.leadId?.schoolName || 'a deal'} has been approved by ${req.user.firstName} ${req.user.lastName}.`,
      '/commissions'
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark commission as disbursed (admin says money sent)
// @route   PUT /api/commissions/:id/disburse
// @access  Admin
exports.disburseCommission = async (req, res) => {
  try {
    const commission = await CommissionPayout.findById(req.params.id);
    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    if (commission.status !== 'Approved') {
      return res.status(400).json({ message: 'Commission must be approved before disbursement' });
    }

    commission.status = 'Disbursed';
    commission.disbursedDate = new Date();
    commission.disbursedBy = req.user._id;
    commission.paymentReference = req.body.paymentReference || '';
    await commission.save();

    const updated = await CommissionPayout.findById(commission._id)
      .populate('userId', 'firstName lastName email')
      .populate('leadId', 'schoolName schoolId')
      .populate('approvedBy', 'firstName lastName')
      .populate('disbursedBy', 'firstName lastName');

    // Notify rep that payment has been sent — they need to confirm
    createNotification(
      commission.userId,
      'commission',
      '💸 Commission Disbursed — Please Confirm',
      `Your commission for ${updated.leadId?.schoolName || 'a deal'} has been disbursed. Please confirm receipt in the Commissions page.`,
      '/commissions'
    );

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Marketer confirms receipt of payment
// @route   PUT /api/commissions/:id/confirm
// @access  Private (owner of the commission)
exports.confirmReceipt = async (req, res) => {
  try {
    const commission = await CommissionPayout.findById(req.params.id);
    if (!commission) {
      return res.status(404).json({ message: 'Commission not found' });
    }

    if (commission.status !== 'Disbursed') {
      return res.status(400).json({ message: 'Commission must be disbursed before you can confirm receipt' });
    }

    // Only the commission owner can confirm
    if (!commission.userId.equals(req.user._id) && !['admin', 'bursar'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only the assigned marketer can confirm receipt' });
    }

    commission.status = 'Paid';
    commission.confirmedBy = req.user._id;
    commission.confirmedDate = new Date();
    await commission.save();

    const updated = await CommissionPayout.findById(commission._id)
      .populate('userId', 'firstName lastName email')
      .populate('leadId', 'schoolName schoolId')
      .populate('approvedBy', 'firstName lastName')
      .populate('disbursedBy', 'firstName lastName')
      .populate('confirmedBy', 'firstName lastName');

    // Notify admins/managers that rep confirmed receipt
    // (notify the disbursedBy user if available, otherwise skip)
    if (updated.disbursedBy?._id) {
      createNotification(
        updated.disbursedBy._id,
        'commission',
        'Commission Receipt Confirmed',
        `${updated.userId?.firstName} ${updated.userId?.lastName} confirmed receipt of commission for ${updated.leadId?.schoolName || 'a deal'}.`,
        '/commissions'
      );
    }

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
    const disbursed = commissions.filter(c => c.status === 'Disbursed');
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
      disbursed: {
        count: disbursed.length,
        amount: disbursed.reduce((sum, c) => sum + c.commissionAmount, 0)
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
