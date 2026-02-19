const mongoose = require('mongoose');

/**
 * Stores exchange rates relative to NGN for multi-currency dashboard aggregation.
 * e.g. { currency: 'USD', rateToNGN: 1650 } means 1 USD = 1,650 NGN
 *
 * Admin can update these via PUT /api/exchange-rates/:currency
 */
const ExchangeRateSchema = new mongoose.Schema({
  currency:    { type: String, required: true, unique: true, uppercase: true, trim: true },
  rateToNGN:   { type: Number, required: true, min: 0 },       // 1 unit of this currency = X NGN
  description: { type: String },                                // e.g. 'US Dollar'
  lastUpdated: { type: Date,   default: Date.now },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

ExchangeRateSchema.index({ currency: 1 });

module.exports = mongoose.model('ExchangeRate', ExchangeRateSchema);
