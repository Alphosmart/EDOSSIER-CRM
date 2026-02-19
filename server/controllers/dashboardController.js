const Lead = require('../models/Lead');

// Helper: filter by role
const filterByRole = (user, fromDate, toDate) => {
  const filter = { isDeleted: { $ne: true } };
  switch (user.role) {
    case 'sales_rep':
      filter.assignedTo = user._id;
      break;
    case 'team_lead':
      filter.territory = user.territory;
      break;
    default:
      break;
  }
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }
  return filter;
};

// @desc    Get KPI metrics
// @route   GET /api/dashboard/kpis
// @access  Private
exports.getKPIs = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = filterByRole(req.user, from, to);
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
    const { from, to } = req.query;
    const filter = filterByRole(req.user, from, to);
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
    const { from, to } = req.query;
    const filter = filterByRole(req.user, from, to);
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
    const { from, to } = req.query;
    const filter = filterByRole(req.user, from, to);
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
    const { from, to } = req.query;
    const filter = filterByRole(req.user, from, to);
    const leads = await Lead.find(filter);

    // Derive distinct states dynamically from actual lead data
    const stateSet = new Set(leads.map(l => l.territory || l.state).filter(Boolean));
    const states = [...stateSet].sort();

    const summary = states.map(state => {
      const sLeads = leads.filter(l => (l.territory || l.state) === state);
      const sClosedWon = sLeads.filter(l => l.currentStatus === 'Closed Won');
      const sActive = sLeads.filter(l =>
        !['Closed Won', 'Closed Lost', 'Not Interested'].includes(l.currentStatus)
      );

      return {
        territory: state,
        totalLeads: sLeads.length,
        activeLeads: sActive.length,
        closedWon: sClosedWon.length,
        revenue: sClosedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0),
        pipelineValue: sActive.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0)
      };
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get revenue forecast (pipeline outlook)
// @route   GET /api/dashboard/forecast
// @access  Private
exports.getForecast = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = filterByRole(req.user, from, to);
    const leads = await Lead.find(filter).populate('assignedTo', 'firstName lastName territory');

    const activeStatuses = [
      'Interested', 'Needs Proposal', 'Needs Approval',
      'Demo Scheduled', 'Proposal Sent', 'Negotiation'
    ];
    const activeLeads = leads.filter(l => activeStatuses.includes(l.currentStatus));
    const closedWon = leads.filter(l => l.currentStatus === 'Closed Won');

    const now = new Date();
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Expected closings this month
    const expectedThisMonth = activeLeads.filter(l => {
      if (!l.expectedClosingDate) return false;
      const d = new Date(l.expectedClosingDate);
      return d >= now && d <= thisMonthEnd;
    });

    // Expected closings next month
    const expectedNextMonth = activeLeads.filter(l => {
      if (!l.expectedClosingDate) return false;
      const d = new Date(l.expectedClosingDate);
      return d >= nextMonthStart && d <= nextMonthEnd;
    });

    // Total pipeline metrics
    const totalNegotiatedRevenue = activeLeads.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0);
    const weightedForecast = activeLeads.reduce((sum, l) => {
      return sum + ((l.negotiatedPrice || 0) * ((l.probabilityOfClosing || 0) / 100));
    }, 0);

    // By stage
    const byStage = activeStatuses.map(status => {
      const stageLeads = activeLeads.filter(l => l.currentStatus === status);
      return {
        status,
        count: stageLeads.length,
        totalValue: stageLeads.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0),
        weightedValue: stageLeads.reduce((sum, l) =>
          sum + ((l.negotiatedPrice || 0) * ((l.probabilityOfClosing || 0) / 100)), 0)
      };
    });

    // Top prospects (highest weighted value, active only)
    const topProspects = activeLeads
      .map(l => ({
        _id: l._id,
        schoolName: l.schoolName,
        schoolId: l.schoolId,
        territory: l.territory,
        currentStatus: l.currentStatus,
        negotiatedPrice: l.negotiatedPrice || 0,
        probabilityOfClosing: l.probabilityOfClosing || 0,
        weightedValue: (l.negotiatedPrice || 0) * ((l.probabilityOfClosing || 0) / 100),
        expectedClosingDate: l.expectedClosingDate,
        assignedTo: l.assignedTo
      }))
      .sort((a, b) => b.weightedValue - a.weightedValue)
      .slice(0, 10);

    res.json({
      totalActivePipeline: activeLeads.length,
      totalNegotiatedRevenue: Math.round(totalNegotiatedRevenue),
      weightedForecast: Math.round(weightedForecast),
      expectedClosingsThisMonth: {
        count: expectedThisMonth.length,
        value: expectedThisMonth.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0)
      },
      expectedClosingsNextMonth: {
        count: expectedNextMonth.length,
        value: expectedNextMonth.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0)
      },
      totalClosedRevenue: closedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0),
      byStage,
      topProspects
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get monthly performance breakdown (deals & revenue by month)
// @route   GET /api/dashboard/monthly-performance
// @access  Private
exports.getMonthlyPerformance = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = filterByRole(req.user, from, to);
    const leads = await Lead.find(filter);

    const closedWon = leads.filter(l => l.currentStatus === 'Closed Won');
    const now = new Date();

    // Last 12 months
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const monthCreated = leads.filter(l => {
        const d = new Date(l.createdAt);
        return d >= monthStart && d <= monthEnd;
      });

      const monthClosed = closedWon.filter(l => {
        const d = l.actualClosingDate ? new Date(l.actualClosingDate) : new Date(l.updatedAt);
        return d >= monthStart && d <= monthEnd;
      });

      const monthRevenue = monthClosed.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0);
      const monthCommission = monthClosed.reduce((sum, l) => sum + (l.commissionAmount || 0), 0);

      months.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        monthKey: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        leadsCreated: monthCreated.length,
        dealsClosed: monthClosed.length,
        revenue: monthRevenue,
        commission: monthCommission,
        avgDealSize: monthClosed.length > 0 ? Math.round(monthRevenue / monthClosed.length) : 0
      });
    }

    // Grand totals
    const totalRevenue = closedWon.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0);
    const totalCommission = closedWon.reduce((sum, l) => sum + (l.commissionAmount || 0), 0);

    res.json({
      months,
      totals: {
        totalLeadsCreated: leads.length,
        totalDealsClosed: closedWon.length,
        totalRevenue,
        totalCommission,
        avgDealSize: closedWon.length > 0 ? Math.round(totalRevenue / closedWon.length) : 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
