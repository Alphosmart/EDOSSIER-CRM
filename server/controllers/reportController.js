const Lead = require('../models/Lead');
const CommissionPayout = require('../models/CommissionPayout');
const { filterLeadsByRole } = require('../utils/queryHelpers');

// @desc    Sales report (date range)
// @route   GET /api/reports/sales
// @access  Private
exports.getSalesReport = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);
    const { startDate, endDate } = req.query;

    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'firstName lastName territory')
      .sort({ createdAt: -1 });

    const closedWon = leads.filter(l => l.currentStatus === 'Closed Won');
    const closedLost = leads.filter(l => l.currentStatus === 'Closed Lost');
    const totalClosed = closedWon.length + closedLost.length;

    res.json({
      totalLeads: leads.length,
      closedWon: closedWon.length,
      closedLost: closedLost.length,
      winRate: totalClosed > 0 ? Math.round((closedWon.length / totalClosed) * 10000) / 100 : 0,
      totalRevenue: closedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0),
      averageDealSize: closedWon.length > 0
        ? Math.round(closedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0) / closedWon.length)
        : 0,
      leads
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Commission report
// @route   GET /api/reports/commissions
// @access  Private
exports.getCommissionReport = async (req, res) => {
  try {
    const filter = req.user.role === 'sales_rep' ? { userId: req.user._id } : {};

    const commissions = await CommissionPayout.find(filter)
      .populate('userId', 'firstName lastName territory')
      .populate('leadId', 'schoolName schoolId')
      .sort({ createdAt: -1 });

    const summary = {
      total: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      pending: commissions.filter(c => c.status === 'Pending').reduce((sum, c) => sum + c.commissionAmount, 0),
      approved: commissions.filter(c => c.status === 'Approved').reduce((sum, c) => sum + c.commissionAmount, 0),
      paid: commissions.filter(c => c.status === 'Paid').reduce((sum, c) => sum + c.commissionAmount, 0)
    };

    res.json({ commissions, summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Territory report
// @route   GET /api/reports/territory
// @access  Private
exports.getTerritoryReport = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);
    const leads = await Lead.find(filter)
      .populate('assignedTo', 'firstName lastName territory');

    // Derive distinct states from actual data
    const stateSet = new Set(leads.map(l => l.territory || l.state).filter(Boolean));
    const states = [...stateSet].sort();

    const report = states.map(state => {
      const tLeads = leads.filter(l => (l.territory || l.state) === state);
      const tClosedWon = tLeads.filter(l => l.currentStatus === 'Closed Won');
      const tClosedLost = tLeads.filter(l => l.currentStatus === 'Closed Lost');
      const tTotalClosed = tClosedWon.length + tClosedLost.length;

      return {
        territory: state,
        totalLeads: tLeads.length,
        closedWon: tClosedWon.length,
        closedLost: tClosedLost.length,
        winRate: tTotalClosed > 0 ? Math.round((tClosedWon.length / tTotalClosed) * 10000) / 100 : 0,
        revenue: tClosedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0),
        commission: tClosedWon.reduce((sum, l) => sum + (l.commissionAmount || 0), 0)
      };
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export data (JSON format for now)
// @route   GET /api/reports/export
// @access  Private
exports.exportData = async (req, res) => {
  try {
    const filter = filterLeadsByRole(req.user);
    const { type = 'leads' } = req.query;

    let data;
    if (type === 'leads') {
      data = await Lead.find(filter)
        .populate('assignedTo', 'firstName lastName territory')
        .sort({ createdAt: -1 })
        .lean();
    } else if (type === 'commissions') {
      const cFilter = req.user.role === 'sales_rep' ? { userId: req.user._id } : {};
      data = await CommissionPayout.find(cFilter)
        .populate('userId', 'firstName lastName')
        .populate('leadId', 'schoolName schoolId')
        .lean();
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
