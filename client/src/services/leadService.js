import api from './api';

export const leadService = {
  getLeads: (params) => api.get('/leads', { params }),
  getLeadById: (id) => api.get(`/leads/${id}`),
  createLead: (data) => api.post('/leads', data),
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
  deleteLead: (id) => api.delete(`/leads/${id}`),
  updateStatus: (id, status) => api.put(`/leads/${id}/status`, { status }),
  getOverdue: () => api.get('/leads/overdue'),
  getToday: () => api.get('/leads/today'),
  getActivities: (leadId) => api.get(`/activities/${leadId}`),
  createActivity: (data) => api.post('/activities', data),

  // CSV Import
  importLeads: (formData) => api.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // File Attachments
  addAttachment: (leadId, formData) => api.post(`/leads/${leadId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAttachment: (leadId, attachmentId) =>
    api.delete(`/leads/${leadId}/attachments/${attachmentId}`),

  // Reminders (admin/manager only)
  remindLead: (id) => api.post(`/leads/${id}/remind`),
  remindAllOverdue: () => api.post('/leads/remind-overdue')
};
