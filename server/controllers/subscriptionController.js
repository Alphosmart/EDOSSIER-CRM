const Lead = require('../models/Lead');
const { filterLeadsByRole } = require('../utils/queryHelpers');

// Helper: calculate MRR from a lead
const calculateMRR = (lead) => {
  const price = lead.negotiatedPrice || 0;
  if (!lead.subscriptionType || lead.currentStatus !== 'Closed Won') return 0;
  switch (lead.subscriptionType) {
    case 'Monthly': return price;
    case 'Quarterly': return price / 3;
    case 'Bi-Annually': return price / 6;
    case 'Annually': return price / 12;
    case 'Custom': return price / 12;
    default: return 0;
  }
};

// @desc    Get subscription summary (MRR, ARR, renewals, mix, revenue at risk)
// @route   GET /api/subscriptions/summary
// @access  Private
exports.getSubscriptionSummary = async (req, res) => {
  try {
    const filter = { ...filterLeadsByRole(req.user), currentStatus: 'Closed Won' };
    const leads = await Lead.find(filter).populate('assignedTo', 'firstName lastName territory');

    const subscribedLeads = leads.filter(l => l.subscriptionType);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // MRR & ARR
    let totalMRR = 0;
    subscribedLeads.forEach(l => { totalMRR += calculateMRR(l); });
    const totalARR = totalMRR * 12;

    // Subscription mix
    const subscriptionMix = {};
    subscribedLeads.forEach(l => {
      const type = l.subscriptionType || 'Not Assigned';
      if (!subscriptionMix[type]) subscriptionMix[type] = { count: 0, revenue: 0, mrr: 0 };
      subscriptionMix[type].count++;
      subscriptionMix[type].revenue += l.negotiatedPrice || 0;
      subscriptionMix[type].mrr += calculateMRR(l);
    });

    // Plan breakdown
    const planBreakdown = {};
    subscribedLeads.forEach(l => {
      const plan = l.subscriptionPlan || 'Not Assigned';
      if (!planBreakdown[plan]) planBreakdown[plan] = { count: 0, revenue: 0 };
      planBreakdown[plan].count++;
      planBreakdown[plan].revenue += l.negotiatedPrice || 0;
    });

    // Renewals
    const renewalsDue30 = subscribedLeads.filter(l => {
      if (!l.renewalDate) return false;
      const rd = new Date(l.renewalDate);
      return rd >= now && rd <= thirtyDaysFromNow;
    });
    const renewalsDue60 = subscribedLeads.filter(l => {
      if (!l.renewalDate) return false;
      const rd = new Date(l.renewalDate);
      return rd >= now && rd <= sixtyDaysFromNow;
    });
    const overdueRenewals = subscribedLeads.filter(l => {
      if (!l.renewalDate) return false;
      return new Date(l.renewalDate) < now;
    });

    // Revenue at risk (renewals due in 30 days + overdue)
    const revenueAtRisk = [...overdueRenewals, ...renewalsDue30].reduce(
      (sum, l) => sum + (l.negotiatedPrice || 0), 0
    );

    // Average revenue per school
    const avgRevenuePerSchool = subscribedLeads.length > 0
      ? subscribedLeads.reduce((sum, l) => sum + (l.negotiatedPrice || 0), 0) / subscribedLeads.length
      : 0;

    // Amount outstanding
    const amountOutstanding = leads.reduce((sum, l) => {
      return sum + Math.max((l.negotiatedPrice || 0) - (l.amountPaid || 0), 0);
    }, 0);

    res.json({
      totalMRR: Math.round(totalMRR),
      totalARR: Math.round(totalARR),
      activeSubscriptions: subscribedLeads.length,
      totalClosedDeals: leads.length,
      subscriptionMix: Object.entries(subscriptionMix).map(([type, data]) => ({
        type, ...data, mrr: Math.round(data.mrr)
      })),
      planBreakdown: Object.entries(planBreakdown).map(([plan, data]) => ({
        plan, ...data
      })),
      renewalsDue30: renewalsDue30.length,
      renewalsDue60: renewalsDue60.length,
      overdueRenewals: overdueRenewals.length,
      revenueAtRisk: Math.round(revenueAtRisk),
      avgRevenuePerSchool: Math.round(avgRevenuePerSchool),
      amountOutstanding: Math.round(amountOutstanding),
      renewalAlerts: [...overdueRenewals, ...renewalsDue30].map(l => ({
        _id: l._id,
        schoolName: l.schoolName,
        schoolId: l.schoolId,
        renewalDate: l.renewalDate,
        negotiatedPrice: l.negotiatedPrice,
        subscriptionType: l.subscriptionType,
        subscriptionPlan: l.subscriptionPlan,
        daysUntilRenewal: Math.ceil((new Date(l.renewalDate) - now) / (1000 * 60 * 60 * 24)),
        territory: l.territory,
        assignedTo: l.assignedTo
      })).sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
