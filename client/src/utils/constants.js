export const LEAD_STATUSES = [
  'Not Interested',
  'Interested',
  'Needs Proposal',
  'Needs Approval',
  'Demo Scheduled',
  'Proposal Sent',
  'Negotiation',
  'Closed Won',
  'Closed Lost'
];

export const ACTIVE_STATUSES = [
  'Interested',
  'Needs Proposal',
  'Needs Approval',
  'Demo Scheduled',
  'Proposal Sent',
  'Negotiation'
];

// Kept for user assignment territory — now references Nigerian states
export { NIGERIAN_STATES as TERRITORIES } from './nigerianStatesLgas';

export const SCHOOL_TYPES = ['Private', 'Public', 'Primary', 'Secondary', 'Tertiary'];

export const FOLLOW_UP_METHODS = ['Call', 'WhatsApp', 'Email', 'Physical Visit'];

export const PAYMENT_STATUSES = ['Not Paid', 'Part Payment', 'Paid Fully'];

export const ROLES = ['sales_rep', 'team_lead', 'manager', 'admin'];

export const STATUS_COLORS = {
  'Not Interested': 'bg-gray-100 text-gray-700',
  'Interested': 'bg-blue-100 text-blue-700',
  'Needs Proposal': 'bg-yellow-100 text-yellow-700',
  'Needs Approval': 'bg-orange-100 text-orange-700',
  'Demo Scheduled': 'bg-purple-100 text-purple-700',
  'Proposal Sent': 'bg-indigo-100 text-indigo-700',
  'Negotiation': 'bg-pink-100 text-pink-700',
  'Closed Won': 'bg-green-100 text-green-700',
  'Closed Lost': 'bg-red-100 text-red-700'
};

export const ROLE_LABELS = {
  sales_rep: 'Sales Rep',
  team_lead: 'Team Lead',
  manager: 'Manager',
  admin: 'Admin'
};

export const SUBSCRIPTION_TYPES = ['Monthly', 'Quarterly', 'Bi-Annually', 'Annually', 'Custom'];

export const SUBSCRIPTION_PLANS = ['Free', 'Basic', 'Deluxe', 'Premium', 'Enterprise', 'Custom'];

export const STORAGE_SIZES = ['5GB', '10GB', '25GB', '50GB', '100GB', 'Unlimited'];

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nassarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];
