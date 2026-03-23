// Available permissions in the system
const PERMISSIONS = {
  // Lead Management
  LEADS_VIEW_ALL: 'leads:view:all',
  LEADS_VIEW_OWN: 'leads:view:own',
  LEADS_VIEW_TERRITORY: 'leads:view:territory',
  LEADS_CREATE: 'leads:create',
  LEADS_EDIT_OWN: 'leads:edit:own',
  LEADS_EDIT_ALL: 'leads:edit:all',
  LEADS_DELETE: 'leads:delete',
  LEADS_ASSIGN: 'leads:assign',
  
  // Financial Permissions
  LEADS_EDIT_COMMISSION: 'leads:edit:commission',
  LEADS_EDIT_PAYMENT: 'leads:edit:payment',
  LEADS_VIEW_PRICING: 'leads:view:pricing',
  
  // Commission Management
  COMMISSIONS_VIEW_ALL: 'commissions:view:all',
  COMMISSIONS_VIEW_OWN: 'commissions:view:own',
  COMMISSIONS_APPROVE: 'commissions:approve',
  COMMISSIONS_DISBURSE: 'commissions:disburse',
  
  // User Management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_PERMISSIONS: 'users:manage:permissions',
  
  // Reports & Analytics
  REPORTS_VIEW: 'reports:view',
  DASHBOARD_VIEW_ALL: 'dashboard:view:all',
  DASHBOARD_VIEW_OWN: 'dashboard:view:own',
  
  // System Management
  SETTINGS_MANAGE: 'settings:manage',
  ACTIVITIES_VIEW_ALL: 'activities:view:all'
};

// Default permissions by role
const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS), // Admin gets all permissions

  bursar: [
    PERMISSIONS.LEADS_VIEW_ALL,
    PERMISSIONS.LEADS_VIEW_PRICING,
    PERMISSIONS.LEADS_EDIT_COMMISSION,
    PERMISSIONS.LEADS_EDIT_PAYMENT,
    PERMISSIONS.COMMISSIONS_VIEW_ALL,
    PERMISSIONS.COMMISSIONS_DISBURSE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.ACTIVITIES_VIEW_ALL
  ],
  
  manager: [
    PERMISSIONS.LEADS_VIEW_ALL,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_EDIT_ALL,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.LEADS_VIEW_PRICING,
    PERMISSIONS.COMMISSIONS_VIEW_ALL,
    PERMISSIONS.COMMISSIONS_APPROVE,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.ACTIVITIES_VIEW_ALL
  ],
  
  team_lead: [
    PERMISSIONS.LEADS_VIEW_TERRITORY,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_EDIT_OWN,
    PERMISSIONS.LEADS_VIEW_PRICING,
    PERMISSIONS.COMMISSIONS_VIEW_OWN,
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.DASHBOARD_VIEW_OWN
  ],
  
  sales_rep: [
    PERMISSIONS.LEADS_VIEW_OWN,
    PERMISSIONS.LEADS_CREATE,
    PERMISSIONS.LEADS_EDIT_OWN,
    PERMISSIONS.LEADS_VIEW_PRICING,
    PERMISSIONS.COMMISSIONS_VIEW_OWN,
    PERMISSIONS.DASHBOARD_VIEW_OWN
  ]
};

/**
 * Get default permissions for a role
 */
function getDefaultPermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.sales_rep;
}

/**
 * Check if user has a specific permission
 */
function hasPermission(user, permission) {
  // Admin always has all permissions
  if (user.role === 'admin') return true;
  
  // Check custom permissions first
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }
  
  // Fall back to role-based permissions
  const rolePermissions = getDefaultPermissions(user.role);
  return rolePermissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
function hasAnyPermission(user, permissions) {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all of the specified permissions
 */
function hasAllPermissions(user, permissions) {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Get all permissions for a user (merged role + custom)
 */
function getUserPermissions(user) {
  if (user.role === 'admin') {
    return Object.values(PERMISSIONS);
  }
  
  // Merge role permissions with custom permissions
  const rolePermissions = getDefaultPermissions(user.role);
  const customPermissions = user.permissions || [];
  
  // Combine and remove duplicates
  return [...new Set([...rolePermissions, ...customPermissions])];
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getDefaultPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions
};
