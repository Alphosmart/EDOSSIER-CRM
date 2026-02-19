/**
 * Format an amount with the correct currency.
 * @param {number} amount
 * @param {string} currencyCode  ISO 4217 code, e.g. 'NGN', 'USD', 'GHS'
 * @returns {string}
 */
export function formatCurrency(amount, currencyCode = 'NGN') {
  if (amount === null || amount === undefined) {
    return `${getCurrencySymbol(currencyCode)}0.00`;
  }
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    // Fallback if the browser doesn't know the currency code
    return `${getCurrencySymbol(currencyCode)}${Number(amount).toFixed(2)}`;
  }
}

/**
 * Returns the best-known symbol for a currency code.
 * Falls back to the code itself.
 */
export function getCurrencySymbol(currencyCode = 'NGN') {
  const symbols = {
    NGN: '₦', USD: '$', GBP: '£', EUR: '€',
    GHS: 'GH₵', KES: 'KSh', ZAR: 'R', UGX: 'USh',
    TZS: 'TSh', RWF: 'RF', XOF: 'CFA', XAF: 'FCFA',
    AED: 'AED', SAR: 'SAR', INR: '₹', CNY: '¥',
    CAD: 'CA$', BRL: 'R$', MUR: '₨', BWP: 'P',
    ZMW: 'ZK', MWK: 'MK', EGP: 'E£', MAD: 'MAD',
  };
  return symbols[currencyCode] || currencyCode;
}

/** Backward-compatible alias — always uses NGN */
export function formatNaira(amount) {
  return formatCurrency(amount, 'NGN');
}
