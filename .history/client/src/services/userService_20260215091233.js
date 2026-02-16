import api from './api';

export const userService = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  deactivate: (id) => api.delete(`/users/${id}`),
  getPerformance: (id) => api.get(`/users/${id}/performance`)
};

export const reportService = {
  getSales: (params) => api.get('/reports/sales', { params }),
  getCommissions: () => api.get('/reports/commissions'),
  getTerritory: () => api.get('/reports/territory'),
  exportData: (params) => api.get('/reports/export', { params })
};
