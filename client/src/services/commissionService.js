import api from './api';

export const commissionService = {
  getAll: (params) => api.get('/commissions', { params }),
  getMy: () => api.get('/commissions/my'),
  approve: (id) => api.put(`/commissions/${id}/approve`),
  pay: (id, data) => api.put(`/commissions/${id}/pay`, data),
  getSummary: () => api.get('/commissions/summary')
};
