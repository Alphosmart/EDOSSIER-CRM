import api from './api';

export const subscriptionService = {
  getSummary: () => api.get('/subscriptions/summary')
};
