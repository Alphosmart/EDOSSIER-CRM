import { formatNaira } from '../../utils/formatCurrency';

export default function CurrencyDisplay({ amount, className = '' }) {
  return (
    <span className={className}>
      {formatNaira(amount)}
    </span>
  );
}
