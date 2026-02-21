const ExchangeRate = require('../models/ExchangeRate');

/**
 * Seed default exchange rates if none exist yet.
 * Call once at server startup.
 */
const DEFAULT_RATES = [
  { currency: 'USD', rateToNGN: 1650,   description: 'US Dollar' },
  { currency: 'GBP', rateToNGN: 2060,   description: 'British Pound Sterling' },
  { currency: 'EUR', rateToNGN: 1780,   description: 'Euro' },
  { currency: 'GHS', rateToNGN: 110,    description: 'Ghanaian Cedi' },
  { currency: 'KES', rateToNGN: 12.5,   description: 'Kenyan Shilling' },
  { currency: 'ZAR', rateToNGN: 87,     description: 'South African Rand' },
  { currency: 'UGX', rateToNGN: 0.44,   description: 'Ugandan Shilling' },
  { currency: 'TZS', rateToNGN: 0.63,   description: 'Tanzanian Shilling' },
  { currency: 'RWF', rateToNGN: 1.02,   description: 'Rwandan Franc' },
  { currency: 'XOF', rateToNGN: 2.7,    description: 'West African CFA Franc' },
  { currency: 'XAF', rateToNGN: 2.7,    description: 'Central African CFA Franc' },
  { currency: 'AED', rateToNGN: 449,    description: 'UAE Dirham' },
  { currency: 'SAR', rateToNGN: 440,    description: 'Saudi Riyal' },
  { currency: 'INR', rateToNGN: 19.5,   description: 'Indian Rupee' },
  { currency: 'CNY', rateToNGN: 227,    description: 'Chinese Yuan' },
  { currency: 'CAD', rateToNGN: 1220,   description: 'Canadian Dollar' },
  { currency: 'BRL', rateToNGN: 292,    description: 'Brazilian Real' },
  { currency: 'MUR', rateToNGN: 36,     description: 'Mauritian Rupee' },
  { currency: 'BWP', rateToNGN: 121,    description: 'Botswana Pula' },
  { currency: 'ZMW', rateToNGN: 61,     description: 'Zambian Kwacha' },
  { currency: 'MWK', rateToNGN: 0.96,   description: 'Malawian Kwacha' },
  { currency: 'EGP', rateToNGN: 34,     description: 'Egyptian Pound' },
  { currency: 'MAD', rateToNGN: 164,    description: 'Moroccan Dirham' },
];

exports.seedDefaultRates = async () => {
  const count = await ExchangeRate.countDocuments();
  if (count === 0) {
    await ExchangeRate.insertMany(DEFAULT_RATES);
    console.log('Exchange rates seeded with defaults');
  }
};

// @desc    Get all exchange rates
// @route   GET /api/exchange-rates
// @access  Private
exports.getAllRates = async (req, res) => {
  try {
    const rates = await ExchangeRate.find().sort({ currency: 1 });
    res.json(rates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create or update an exchange rate
// @route   PUT /api/exchange-rates/:currency
// @access  Private (admin/manager)
exports.upsertRate = async (req, res) => {
  try {
    const { currency } = req.params;
    const { rateToNGN, description } = req.body;

    if (!rateToNGN || rateToNGN <= 0) {
      return res.status(400).json({ message: 'rateToNGN must be a positive number' });
    }

    const rate = await ExchangeRate.findOneAndUpdate(
      { currency: currency.toUpperCase() },
      {
        currency: currency.toUpperCase(),
        rateToNGN: Number(rateToNGN),
        description: description || undefined,
        lastUpdated: new Date(),
        updatedBy: req.user._id,
        source: 'manual',       // mark as manually edited so UI can distinguish
        apiProvider: null
      },
      { upsert: true, new: true }
    );

    res.json(rate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Trigger an immediate live rate sync from open.er-api.com
// @route   POST /api/exchange-rates/refresh
// @access  Private (admin/manager)
exports.refreshRates = async (req, res) => {
  try {
    const { fetchAndUpdateRates } = require('../jobs/exchangeRateJob');
    const result = await fetchAndUpdateRates();
    if (result.error) {
      return res.status(502).json({ message: `Rate provider error: ${result.error}` });
    }
    res.json({ message: `Synced ${result.updated} rates successfully`, ...result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an exchange rate entry
// @route   DELETE /api/exchange-rates/:currency
// @access  Private (admin only)
exports.deleteRate = async (req, res) => {
  try {
    await ExchangeRate.findOneAndDelete({ currency: req.params.currency.toUpperCase() });
    res.json({ message: 'Exchange rate deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Utility: Load all rates and return a lookup map { USD: 1650, GBP: 2060, ... }
 * Used by dashboardController for currency conversion.
 */
exports.getRateMap = async () => {
  const rates = await ExchangeRate.find();
  const map = { NGN: 1 };
  rates.forEach(r => { map[r.currency] = r.rateToNGN; });
  return map;
};
