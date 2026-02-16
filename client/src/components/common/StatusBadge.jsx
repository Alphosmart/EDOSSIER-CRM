import { STATUS_COLORS } from '../../utils/constants';

export default function StatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status}
    </span>
  );
}
