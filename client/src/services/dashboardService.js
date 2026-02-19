import api from './api';

export const dashboardService = {
  getKPIs: () => api.get('/dashboard/kpis'),
  getPipeline: () => api.get('/dashboard/pipeline'),
  getRevenue: () => api.get('/dashboard/revenue'),
  getMonthly: () => api.get('/dashboard/monthly'),
  getTerritory: () => api.get('/dashboard/territory'),
  getForecast: () => api.get('/dashboard/forecast'),
  getMonthlyPerformance: () => api.get('/dashboard/monthly-performance')
};
