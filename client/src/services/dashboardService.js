import api from './api';

const buildParams = (opts = {}) => {
  const params = {};
  if (opts.from) params.from = opts.from;
  if (opts.to) params.to = opts.to;
  return { params };
};

export const dashboardService = {
  getKPIs: (opts) => api.get('/dashboard/kpis', buildParams(opts)),
  getPipeline: (opts) => api.get('/dashboard/pipeline', buildParams(opts)),
  getRevenue: (opts) => api.get('/dashboard/revenue', buildParams(opts)),
  getMonthly: (opts) => api.get('/dashboard/monthly', buildParams(opts)),
  getTerritory: (opts) => api.get('/dashboard/territory', buildParams(opts)),
  getForecast: (opts) => api.get('/dashboard/forecast', buildParams(opts)),
  getMonthlyPerformance: (opts) => api.get('/dashboard/monthly-performance', buildParams(opts)),
  compareStats: (periodA_from, periodA_to, periodB_from, periodB_to) =>
    api.get('/dashboard/compare', { params: { periodA_from, periodA_to, periodB_from, periodB_to } }),
};
