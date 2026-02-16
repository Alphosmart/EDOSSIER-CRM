import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/formatDate';
import { HiOutlineExclamation } from 'react-icons/hi';

export default function OverdueAlerts({ overdue = [], today = [] }) {
  const allAlerts = [
    ...overdue.map(l => ({ ...l, alertType: 'overdue' })),
    ...today.map(l => ({ ...l, alertType: 'today' }))
  ].slice(0, 8);

  if (allAlerts.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-Up Alerts</h3>
        <div className="text-center py-6 text-gray-500">
          <p>No pending follow-ups 🎉</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-Up Alerts</h3>
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {allAlerts.map((alert) => (
          <Link
            key={alert._id}
            to={`/leads/${alert._id}`}
            className={`block p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
              alert.alertType === 'overdue' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
            }`}
          >
            <div className="flex items-start gap-2">
              <HiOutlineExclamation
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  alert.alertType === 'overdue' ? 'text-red-500' : 'text-yellow-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{alert.schoolName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={alert.currentStatus} />
                  <span className="text-xs text-gray-500">
                    {alert.alertType === 'overdue' ? 'Overdue:' : 'Due:'} {formatDate(alert.nextFollowUpDate)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
