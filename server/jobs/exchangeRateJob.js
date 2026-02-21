/**
 * Exchange Rate Auto-Sync Job
 *
 * Fetches live exchange rates from open.er-api.com (free, no API key required,
 * updates once per day from their end). We poll every 6 hours so we always have
 * fresh rates within one business day, regardless of cached results.
 *
 * API: https://open.er-api.com/v6/latest/USD
 * Returns rates relative to USD; we convert to rateToNGN = rates.NGN / rates.X
 */

const cron   = require('node-cron');
const ExchangeRate = require('../models/ExchangeRate');

const RATE_API_URL = 'https://open.er-api.com/v6/latest/USD';

/**
 * Fetch live rates and upsert all currencies already stored in the DB.
 * Rates manually edited by an admin are also updated (live data wins),
 * but they are flagged with source='auto' so the UI shows the change.
 * Returns a summary { updated, failed, rateMap }.
 */
const fetchAndUpdateRates = async () => {
  let json;
  try {
    const res = await fetch(RATE_API_URL, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } catch (err) {
    console.error('[ExchangeRateJob] Fetch failed:', err.message);
    return { updated: 0, failed: 1, error: err.message };
  }

  if (json.result !== 'success' || !json.rates) {
    console.error('[ExchangeRateJob] Unexpected API response:', json);
    return { updated: 0, failed: 1, error: 'Unexpected API response' };
  }

  const apiRates  = json.rates;          // { USD: 1, NGN: 1650, GBP: 0.79, ... }
  const ngnPerUsd = apiRates['NGN'] || 1; // 1 USD = X NGN

  // Compute rateToNGN for every currency in the API response
  // rateToNGN = how many NGN you get for 1 unit of this currency
  const computeRateToNGN = (code) => {
    if (code === 'NGN') return 1;
    if (!apiRates[code] || apiRates[code] === 0) return null;
    return ngnPerUsd / apiRates[code];
  };

  // Only update currencies we already have in the database (don't auto-add new ones)
  const existing = await ExchangeRate.find({}, 'currency').lean();
  let updated = 0;
  let failed  = 0;

  for (const { currency } of existing) {
    if (currency === 'NGN') continue;   // NGN is always 1, never in the API
    const rateToNGN = computeRateToNGN(currency);
    if (!rateToNGN) { failed++; continue; }

    await ExchangeRate.findOneAndUpdate(
      { currency },
      {
        rateToNGN:   Math.round(rateToNGN * 10000) / 10000,  // 4 decimal places
        lastUpdated: new Date(),
        source:      'auto',
        apiProvider: 'open.er-api.com',
        // Clear updatedBy so UI shows "Auto-synced" instead of a user name
        $unset: { updatedBy: '' }
      }
    );
    updated++;
  }

  console.log(`[ExchangeRateJob] Synced ${updated} rates (${failed} skipped/failed) from open.er-api.com`);
  return { updated, failed };
};

/**
 * Start the cron job — runs every 6 hours.
 */
const startExchangeRateJob = () => {
  // Run once immediately at startup (after a short delay for the DB to connect)
  setTimeout(() => {
    fetchAndUpdateRates().catch(err => console.error('[ExchangeRateJob] Startup sync error:', err));
  }, 5000);

  // Then every 6 hours: at minute 0 of hours 0, 6, 12, 18
  cron.schedule('0 */6 * * *', () => {
    console.log('[ExchangeRateJob] Running scheduled rate sync…');
    fetchAndUpdateRates().catch(err => console.error('[ExchangeRateJob] Scheduled sync error:', err));
  });

  console.log('[ExchangeRateJob] Scheduled: every 6 hours (next runs at 00:00, 06:00, 12:00, 18:00)');
};

module.exports = { startExchangeRateJob, fetchAndUpdateRates };
