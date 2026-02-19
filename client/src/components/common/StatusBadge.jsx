import { STATUS_COLORS } from '../../utils/constants';

export default function StatusBadge({ status, size = 'sm' }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  const sizeClass = size === 'xs' ? 'px-1.5 py-0 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${colorClass} ${sizeClass}`}>
      {status}
    </span>
  );
}
