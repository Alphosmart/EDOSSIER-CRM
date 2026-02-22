import { timeAgo, formatDate } from '../../utils/formatDate';
import {
  HiOutlinePhone, HiOutlineMail, HiOutlineChatAlt2,
  HiOutlineEye, HiOutlineDesktopComputer, HiOutlineDocumentText,
  HiOutlineRefresh, HiOutlinePencilAlt
} from 'react-icons/hi';

const ACTIVITY_ICONS = {
  'Call': HiOutlinePhone,
  'Email': HiOutlineMail,
  'WhatsApp': HiOutlineChatAlt2,
  'Visit': HiOutlineEye,
  'Demo': HiOutlineDesktopComputer,
  'Proposal Sent': HiOutlineDocumentText,
  'Status Change': HiOutlineRefresh,
  'Note Added': HiOutlinePencilAlt,
};

const ACTIVITY_COLORS = {
  'Call': 'bg-blue-100 text-blue-600',
  'Email': 'bg-green-100 text-green-600',
  'WhatsApp': 'bg-emerald-100 text-emerald-600',
  'Visit': 'bg-purple-100 text-purple-600',
  'Demo': 'bg-indigo-100 text-indigo-600',
  'Proposal Sent': 'bg-yellow-100 text-yellow-600',
  'Status Change': 'bg-orange-100 text-orange-600',
  'Note Added': 'bg-gray-100 text-gray-600',
};

export default function ActivityTimeline({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>No activities recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = ACTIVITY_ICONS[activity.activityType] || HiOutlinePencilAlt;
        const colorClass = ACTIVITY_COLORS[activity.activityType] || 'bg-gray-100 text-gray-600';

        return (
          <div key={activity._id || index} className="flex gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{activity.activityType}</span>
                <span className="text-xs text-gray-500">{timeAgo(activity.createdAt)}</span>
              </div>
              {activity.description && (
                <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
              )}
              {activity.outcome && (
                <p className="text-xs text-gray-500 mt-0.5">Outcome: {activity.outcome}</p>
              )}
              {activity.nextAction && (
                <p className="text-xs text-gray-500 mt-0.5 italic">Next: {activity.nextAction}</p>
              )}
              {activity.followUpDate && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-2 py-1 rounded-md">
                  <span>📅</span>
                  <span className="font-medium">Follow-up: {formatDate(activity.followUpDate)}</span>
                  {activity.followUpMethod && (
                    <span className="text-amber-500">via {activity.followUpMethod}</span>
                  )}
                </div>
              )}
              {activity.userId && (
                <p className="text-xs text-gray-400 mt-0.5">
                  by {activity.userId.firstName} {activity.userId.lastName}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
