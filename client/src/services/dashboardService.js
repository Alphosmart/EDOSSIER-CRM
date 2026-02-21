import api from './api';

const buildParams = (opts = {}) => {
  const params = {};
  if (opts.from)    params.from    = opts.from;
  if (opts.to)      params.to      = opts.to;
  if (opts.country) params.country = opts.country;
  if (opts.state)   params.state   = opts.state;
  if (opts.lga)     params.lga     = opts.lga;
  if (opts.level)   params.level   = opts.level;   // geo breakdown grouping level
  return { params };
};

export const dashboardService = {
  getKPIs:              (opts) => api.get('/dashboard/kpis',                buildParams(opts)),
  getPipeline:          (opts) => api.get('/dashboard/pipeline',            buildParams(opts)),
  getRevenue:           (opts) => api.get('/dashboard/revenue',             buildParams(opts)),
  getMonthly:           (opts) => api.get('/dashboard/monthly',             buildParams(opts)),
  getTerritory:         (opts) => api.get('/dashboard/territory',           buildParams(opts)),
  getForecast:          (opts) => api.get('/dashboard/forecast',            buildParams(opts)),
  getMonthlyPerformance:(opts) => api.get('/dashboard/monthly-performance', buildParams(opts)),
  compareStats: (periodA_from, periodA_to, periodB_from, periodB_to) =>
    api.get('/dashboard/compare', { params: { periodA_from, periodA_to, periodB_from, periodB_to } }),

  // Geographic drill-down
  getGeoBreakdown: (opts) =>
    api.get('/dashboard/geo-breakdown', buildParams(opts)),

  // Cascading dropdown options (country → state → LGA)
  getGeoOptions: (country, state) =>
    api.get('/dashboard/geo-options', {
      params: { ...(country ? { country } : {}), ...(state ? { state } : {}) }
    }),
};
