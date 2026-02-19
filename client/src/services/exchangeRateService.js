import api from './api';

export const exchangeRateService = {
  /** Get all exchange rates */
  getRates: () => api.get('/exchange-rates'),

  /**
   * Create or update a rate.
   * @param {string} currency - ISO 4217 code, e.g. 'USD'
   * @param {number} rateToNGN - 1 unit of this currency = X NGN
   * @param {string} description - optional friendly name
   */
  upsertRate: (currency, rateToNGN, description) =>
    api.put(`/exchange-rates/${currency}`, { rateToNGN, description }),

  /** Delete a rate (admin only) */
  deleteRate: (currency) => api.delete(`/exchange-rates/${currency}`),
};
