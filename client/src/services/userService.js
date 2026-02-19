import api from './api';

export const userService = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  setCommissionRate: (id, rate) => api.patch(`/users/${id}/commission-rate`, { defaultCommissionRate: rate }),
  deactivate: (id) => api.delete(`/users/${id}`),
  getPerformance: (id) => api.get(`/users/${id}/performance`)
};

export const reportService = {
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getCommissionReport: (params) => api.get('/reports/commissions', { params }),
  getTerritoryReport: (params) => api.get('/reports/territory', { params }),
  exportData: (params) => api.get('/reports/export', { params })
};
