// Available permissions in the system - must match backend
export const PERMISSIONS = {
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

// Permission groups for UI organization
export const PERMISSION_GROUPS = {
  'Lead Management': [
    { key: 'LEADS_VIEW_ALL', label: 'View All Leads', description: 'View all leads in the system' },
    { key: 'LEADS_VIEW_OWN', label: 'View Own Leads', description: 'View only assigned leads' },
    { key: 'LEADS_VIEW_TERRITORY', label: 'View Territory Leads', description: 'View leads in same territory' },
    { key: 'LEADS_CREATE', label: 'Create Leads', description: 'Add new leads' },
    { key: 'LEADS_EDIT_OWN', label: 'Edit Own Leads', description: 'Edit own assigned leads' },
    { key: 'LEADS_EDIT_ALL', label: 'Edit All Leads', description: 'Edit any lead' },
    { key: 'LEADS_DELETE', label: 'Delete Leads', description: 'Delete leads from system' },
    { key: 'LEADS_ASSIGN', label: 'Assign Leads', description: 'Assign leads to users' }
  ],
  'Financial': [
    { key: 'LEADS_EDIT_COMMISSION', label: 'Edit Commission %', description: 'Change commission percentage' },
    { key: 'LEADS_EDIT_PAYMENT', label: 'Edit Payment Status', description: 'Update payment status and amount' },
    { key: 'LEADS_VIEW_PRICING', label: 'View Pricing', description: 'View deal values and pricing' }
  ],
  'Commissions': [
    { key: 'COMMISSIONS_VIEW_ALL', label: 'View All Commissions', description: 'View all commission payouts' },
    { key: 'COMMISSIONS_VIEW_OWN', label: 'View Own Commissions', description: 'View personal commissions' },
    { key: 'COMMISSIONS_APPROVE', label: 'Approve Commissions', description: 'Approve pending commissions' },
    { key: 'COMMISSIONS_DISBURSE', label: 'Disburse Commissions', description: 'Mark commissions as disbursed' }
  ],
  'Users & Teams': [
    { key: 'USERS_VIEW', label: 'View Users', description: 'View all users in system' },
    { key: 'USERS_CREATE', label: 'Create Users', description: 'Add new users' },
    { key: 'USERS_EDIT', label: 'Edit Users', description: 'Edit user information' },
    { key: 'USERS_DELETE', label: 'Delete Users', description: 'Deactivate users' },
    { key: 'USERS_MANAGE_PERMISSIONS', label: 'Manage Permissions', description: 'Assign custom permissions' }
  ],
  'Reports & Analytics': [
    { key: 'REPORTS_VIEW', label: 'View Reports', description: 'Access reports' },
    { key: 'DASHBOARD_VIEW_ALL', label: 'View All Dashboard Data', description: 'See organization-wide metrics' },
    { key: 'DASHBOARD_VIEW_OWN', label: 'View Own Dashboard', description: 'See personal metrics only' },
    { key: 'ACTIVITIES_VIEW_ALL', label: 'View All Activities', description: 'See all user activities' }
  ],
  'System': [
    { key: 'SETTINGS_MANAGE', label: 'Manage Settings', description: 'Change system settings' }
  ]
};

// Default permissions by role
export const ROLE_PERMISSIONS = {
  admin: Object.values(PERMISSIONS),
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
