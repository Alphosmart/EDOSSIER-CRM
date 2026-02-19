import { formatCurrency } from '../../utils/formatCurrency';

/**
 * Displays a monetary amount formatted for the given currency.
 * @param {number} amount
 * @param {string} currency  ISO 4217 code (default 'NGN')
 */
export default function CurrencyDisplay({ amount, currency = 'NGN', className = '' }) {
  return (
    <span className={className}>
      {formatCurrency(amount, currency)}
    </span>
  );
}
