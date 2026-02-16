const Lead = require('../models/Lead');

// Helper: filter by role
const filterByRole = (user) => {
  switch (user.role) {
    case 'sales_rep':
      return { assignedTo: user._id };
    case 'team_lead':
      return { territory: user.territory };
    default:
      return {};
  }
};

// @desc    Get KPI metrics
// @route   GET /api/dashboard/kpis
// @access  Private
exports.getKPIs = async (req, res) => {
  try {
    const filter = filterByRole(req.user);
    const leads = await Lead.find(filter);

    const activeStatuses = [
      'Interested', 'Needs Proposal', 'Needs Approval',
      'Demo Scheduled', 'Proposal Sent', 'Negotiation'
    ];

    const activeLeads = leads.filter(l => activeStatuses.includes(l.currentStatus));
    const closedWon = leads.filter(l => l.currentStatus === 'Closed Won');
    const closedLost = leads.filter(l => l.currentStatus === 'Closed Lost');
    const totalClosed = closedWon.length + closedLost.length;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const overdueFollowUps = leads.filter(l => {
      if (!l.nextFollowUpDate) return false;
      if (['Closed Won', 'Closed Lost', 'Not Interested'].includes(l.currentStatus)) return false;
      return new Date(l.nextFollowUpDate) < today;
    });

    const followUpsDueToday = leads.filter(l => {
      if (!l.nextFollowUpDate) return false;
      if (['Closed Won', 'Closed Lost', 'Not Interested'].includes(l.currentStatus)) return false;
      const date = new Date(l.nextFollowUpDate);
      return date >= today && date < tomorrow;
    });

    const totalClosedRevenue = closedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0);
    const totalCommissionEarned = closedWon.reduce((sum, l) => sum + (l.commissionAmount || 0), 0);
    const activePipelineValue = activeLeads.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0);
    const weightedForecast = activeLeads.reduce((sum, l) => {
      return sum + ((l.negotiatedPrice || 0) * ((l.probabilityOfClosing || 0) / 100));
    }, 0);

    const statusBreakdown = {};
    activeStatuses.forEach(status => {
      statusBreakdown[status] = leads.filter(l => l.currentStatus === status).length;
    });

    res.json({
      totalLeadsInPipeline: activeLeads.length,
      activePipelineValue,
      weightedForecast,
      totalClosedWon: closedWon.length,
      totalClosedLost: closedLost.length,
      winRate: totalClosed > 0 ? Math.round((closedWon.length / totalClosed) * 10000) / 100 : 0,
      totalClosedRevenue,
      totalCommissionEarned,
      averageDealSize: closedWon.length > 0 ? Math.round(totalClosedRevenue / closedWon.length) : 0,
      overdueFollowUps: overdueFollowUps.length,
      followUpsDueToday: followUpsDueToday.length,
      statusBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pipeline breakdown
// @route   GET /api/dashboard/pipeline
// @access  Private
exports.getPipeline = async (req, res) => {
  try {
    const filter = filterByRole(req.user);
    const leads = await Lead.find(filter);

    const statuses = [
      'Not Interested', 'Interested', 'Needs Proposal', 'Needs Approval',
      'Demo Scheduled', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'
    ];

    const pipeline = statuses.map(status => {
      const statusLeads = leads.filter(l => l.currentStatus === status);
      return {
        status,
        count: statusLeads.length,
        value: statusLeads.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0)
      };
    });

    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get revenue forecast
// @route   GET /api/dashboard/revenue
// @access  Private
exports.getRevenue = async (req, res) => {
  try {
    const filter = filterByRole(req.user);
    const leads = await Lead.find(filter);

    const closedWon = leads.filter(l => l.currentStatus === 'Closed Won');

    // Monthly revenue for the past 12 months
    const monthlyRevenue = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthDeals = closedWon.filter(l => {
        const closingDate = l.actualClosingDate || l.updatedAt;
        return closingDate >= month && closingDate < nextMonth;
      });

      monthlyRevenue.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthDeals.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0),
        deals: monthDeals.length
      });
    }

    // Forecast based on active pipeline
    const activeStatuses = [
      'Interested', 'Needs Proposal', 'Needs Approval',
      'Demo Scheduled', 'Proposal Sent', 'Negotiation'
    ];
    const activeLeads = leads.filter(l => activeStatuses.includes(l.currentStatus));
    const forecast = activeLeads.reduce((sum, l) => {
      return sum + ((l.negotiatedPrice || 0) * ((l.probabilityOfClosing || 0) / 100));
    }, 0);

    res.json({
      monthlyRevenue,
      totalClosed: closedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0),
      forecast,
      activePipeline: activeLeads.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get monthly performance
// @route   GET /api/dashboard/monthly
// @access  Private
exports.getMonthly = async (req, res) => {
  try {
    const filter = filterByRole(req.user);
    const leads = await Lead.find(filter).populate('assignedTo', 'firstName lastName');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthLeads = leads.filter(l => {
      return l.createdAt >= startOfMonth && l.createdAt <= endOfMonth;
    });

    const monthClosedWon = leads.filter(l => {
      if (l.currentStatus !== 'Closed Won') return false;
      const closeDate = l.actualClosingDate || l.updatedAt;
      return closeDate >= startOfMonth && closeDate <= endOfMonth;
    });

    res.json({
      newLeadsThisMonth: monthLeads.length,
      closedWonThisMonth: monthClosedWon.length,
      revenueThisMonth: monthClosedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0),
      commissionThisMonth: monthClosedWon.reduce((sum, l) => sum + (l.commissionAmount || 0), 0)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get territory summary
// @route   GET /api/dashboard/territory
// @access  Private
exports.getTerritory = async (req, res) => {
  try {
    const filter = filterByRole(req.user);
    const leads = await Lead.find(filter);

    const territories = ['Kaduna', 'Abuja', 'Lagos', 'Other'];

    const summary = territories.map(territory => {
      const tLeads = leads.filter(l => l.territory === territory);
      const tClosedWon = tLeads.filter(l => l.currentStatus === 'Closed Won');
      const tActive = tLeads.filter(l =>
        !['Closed Won', 'Closed Lost', 'Not Interested'].includes(l.currentStatus)
      );

      return {
        territory,
        totalLeads: tLeads.length,
        activeLeads: tActive.length,
        closedWon: tClosedWon.length,
        revenue: tClosedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0),
        pipelineValue: tActive.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0)
      };
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
