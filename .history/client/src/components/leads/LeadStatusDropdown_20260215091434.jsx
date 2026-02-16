import { LEAD_STATUSES, STATUS_COLORS } from '../../utils/constants';

export default function LeadStatusDropdown({ currentStatus, onChange, disabled = false }) {
  return (
    <select
      value={currentStatus}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-primary-500 ${
        STATUS_COLORS[currentStatus] || 'bg-gray-100 text-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {LEAD_STATUSES.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}
