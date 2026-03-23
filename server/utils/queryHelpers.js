/**
 * Shared constants and query helpers used across controllers
 */

// Lead statuses that represent active pipeline (in-progress, not yet closed)
const ACTIVE_STATUSES = [
  'Interested', 'Needs Proposal', 'Needs Approval',
  'Demo Scheduled', 'Proposal Sent', 'Negotiation'
];

// Filter leads by user role (exported for use in search & report controllers too)
// sales_rep / team_lead: see leads they are assigned to OR leads they originally brought
const filterLeadsByRole = (user) => {
  const base = { isDeleted: { $ne: true } };
  switch (user.role) {
    case 'sales_rep':
      return { ...base, $or: [{ assignedTo: user._id }, { createdBy: user._id }] };
    case 'team_lead':
      return { ...base, $or: [{ territory: user.territory }, { createdBy: user._id }] };
    case 'manager':
    case 'bursar':
    case 'admin':
      return base;
    default:
      return { ...base, $or: [{ assignedTo: user._id }, { createdBy: user._id }] };
  }
};

module.exports = { filterLeadsByRole, ACTIVE_STATUSES };
