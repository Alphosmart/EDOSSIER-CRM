/**
 * Shared query helpers used across controllers
 */

// Filter leads by user role (exported for use in search & report controllers too)
const filterLeadsByRole = (user) => {
  const base = { isDeleted: { $ne: true } };
  switch (user.role) {
    case 'sales_rep':
      return { ...base, assignedTo: user._id };
    case 'team_lead':
      return { ...base, territory: user.territory };
    case 'manager':
    case 'admin':
      return base;
    default:
      return { ...base, assignedTo: user._id };
  }
};

module.exports = { filterLeadsByRole };
