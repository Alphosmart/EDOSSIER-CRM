import api from './api';

export const commissionService = {
  getAll: (params) => api.get('/commissions', { params }),
  getMy: () => api.get('/commissions/my'),
  approve: (id) => api.put(`/commissions/${id}/approve`),
  disburse: (id, data) => api.put(`/commissions/${id}/disburse`, data),
  confirm: (id) => api.put(`/commissions/${id}/confirm`),
  getSummary: () => api.get('/commissions/summary')
};
