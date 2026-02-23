import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { formatNaira } from '../../utils/formatCurrency';
import { formatDate, isOverdue } from '../../utils/formatDate';
import LeadStatusDropdown from './LeadStatusDropdown';
import { useAuth } from '../../context/AuthContext';
import { HiOutlinePhone, HiOutlineMail, HiOutlineCalendar, HiOutlineUser, HiOutlinePencil } from 'react-icons/hi';

// Days since status last changed (lead.updatedAt)
function AgingBadge({ updatedAt }) {
  const days = Math.floor((Date.now() - new Date(updatedAt)) / 86400000);
  if (days < 7) return <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{days}d</span>;
  if (days < 14) return <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">{days}d ⚠</span>;
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{days}d 🔥</span>;
}

export default function LeadCard({ lead, onStatusChange }) {
  const { user } = useAuth();
  const overdue = lead.nextFollowUpDate && isOverdue(lead.nextFollowUpDate) &&
    !['Closed Won', 'Closed Lost', 'Not Interested'].includes(lead.currentStatus);

  const isBroughtByMe = lead.createdBy &&
    (lead.createdBy._id === user?._id || lead.createdBy === user?._id);

  return (
    <div className={`card hover:shadow-md transition-shadow ${overdue ? 'border-l-4 border-l-red-400' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <Link
            to={`/leads/${lead._id}`}
            className="text-base font-semibold text-gray-900 hover:text-primary-600 transition-colors"
          >
            {lead.schoolName}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5">{lead.schoolId} • {lead.territory}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <AgingBadge updatedAt={lead.updatedAt || lead.createdAt} />
          <LeadStatusDropdown
            currentStatus={lead.currentStatus}
            onChange={(status) => onStatusChange(lead._id, status)}
          />
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        {lead.personMet && (
          <p className="flex items-center gap-2">
            <span className="font-medium">{lead.personMet}</span>
            <span className="text-gray-400">•</span>
            <span>{lead.positionTitle}</span>
          </p>
        )}

        <div className="flex items-center gap-4">
          {lead.phoneNumber && (
            <span className="flex items-center gap-1">
              <HiOutlinePhone className="w-4 h-4 text-gray-400" />
              {lead.phoneNumber}
            </span>
          )}
          {lead.emailAddress && (
            <span className="flex items-center gap-1">
              <HiOutlineMail className="w-4 h-4 text-gray-400" />
              {lead.emailAddress}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <span className="text-gray-500">Deal: </span>
            <span className="font-semibold text-gray-900">
              {formatNaira(lead.negotiatedPrice || lead.proposedPrice)}
            </span>
          </div>
          {lead.probabilityOfClosing > 0 && (
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
              {lead.probabilityOfClosing}% chance
            </span>
          )}
        </div>

        {lead.nextFollowUpDate && (
          <div className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            <HiOutlineCalendar className="w-4 h-4" />
            {overdue ? 'OVERDUE: ' : 'Follow-up: '}
            {formatDate(lead.nextFollowUpDate)}
            {lead.followUpMethod && ` via ${lead.followUpMethod}`}
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {lead.assignedTo && (
            <span className="text-gray-500">Assigned: {lead.assignedTo.firstName} {lead.assignedTo.lastName}</span>
          )}
          {isBroughtByMe && (
            <span className="flex items-center gap-1 text-primary-600 font-medium">
              <HiOutlineUser className="w-3.5 h-3.5" />
              Brought by you
            </span>
          )}
        </div>
        <Link 
          to={`/leads/${lead._id}`} 
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          title="View and edit lead details"
        >
          <HiOutlinePencil className="w-3.5 h-3.5" />
          Edit
        </Link>
      </div>
    </div>
  );
}
