import api from './api';

export const reportService = {
  getSalesReport:       (params) => api.get('/reports/sales',       { params }),
  getCommissionReport:  (params) => api.get('/reports/commissions',  { params }),
  getTerritoryReport:   (params) => api.get('/reports/territory',    { params }),
  exportData:           (params) => api.get('/reports/export',       { params })
};
