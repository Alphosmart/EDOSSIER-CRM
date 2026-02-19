/**
 * Shared query helpers used across controllers
 */

// Filter leads by user role (exported for use in search & report controllers too)
const filterLeadsByRole = (user) => {
  switch (user.role) {
    case 'sales_rep':
      return { assignedTo: user._id };
    case 'team_lead':
      return { territory: user.territory };
    case 'manager':
    case 'admin':
      return {};
    default:
      return { assignedTo: user._id };
  }
};

module.exports = { filterLeadsByRole };
