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

  /**
   * Trigger an immediate live sync from open.er-api.com.
   * Returns { updated, failed }.
   */
  refreshRates: () => api.post('/exchange-rates/refresh'),
};

// ─── Client-side rate cache ─────────────────────────────────────────────────
let _rateCache = null;
let _rateFetchPromise = null;

/**
 * Returns a rate map { NGN: 1, USD: 1650, GBP: 2060, ... } fetched once and cached.
 * USD is the standard display currency; all other amounts are converted relative to it.
 */
export async function getCachedRateMap() {
  if (_rateCache) return _rateCache;
  if (_rateFetchPromise) return _rateFetchPromise;
  _rateFetchPromise = exchangeRateService.getRates()
    .then(({ data }) => {
      const map = { NGN: 1 };
      data.forEach(r => { map[r.currency] = r.rateToNGN; });
      _rateCache = map;
      return map;
    })
    .catch(() => ({ NGN: 1, USD: 1650 }));
  return _rateFetchPromise;
}

/** Invalidate cache (call after saving rate changes in Settings) */
export function invalidateRateCache() {
  _rateCache = null;
  _rateFetchPromise = null;
}

/**
 * Convert an amount in any currency to USD.
 * @param {number} amount
 * @param {string} currency  e.g. 'NGN', 'GBP'
 * @param {object} rateMap   from getCachedRateMap()
 */
export function convertToUSD(amount, currency, rateMap) {
  if (!amount || !rateMap) return 0;
  const rateToNGN = rateMap[currency] || 1;
  const usdRate = rateMap['USD'] || 1650;
  return (amount * rateToNGN) / usdRate;
}

