import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { leadService } from '../services/leadService';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import CurrencyDisplay from '../components/common/CurrencyDisplay';
import LeadStatusDropdown from '../components/leads/LeadStatusDropdown';
import ActivityTimeline from '../components/leads/ActivityTimeline';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import LeadForm from '../components/leads/LeadForm';
import { formatDate, isOverdue } from '../utils/formatDate';
import { formatNaira } from '../utils/formatCurrency';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowLeft, HiOutlinePencil, HiOutlinePhone,
  HiOutlineMail, HiOutlineLocationMarker, HiOutlineCalendar,
  HiOutlinePlus
} from 'react-icons/hi';

const ACTIVITY_TYPES = ['Call', 'Email', 'WhatsApp', 'Visit', 'Demo', 'Proposal Sent', 'Note Added'];

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activityType: 'Call',
    description: '',
    outcome: '',
    nextAction: ''
  });

  useEffect(() => {
    loadLead();
  }, [id]);

  const loadLead = async () => {
    try {
      const [leadRes, actRes] = await Promise.all([
        leadService.getLeadById(id),
        leadService.getActivities(id)
      ]);
      setLead(leadRes.data);
      setActivities(actRes.data);
    } catch (error) {
      toast.error('Failed to load lead');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await leadService.updateStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      loadLead();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdate = async (data) => {
    try {
      await leadService.updateLead(id, data);
      toast.success('Lead updated successfully');
      setEditing(false);
      loadLead();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    try {
      await leadService.createActivity({ ...activityForm, leadId: id });
      toast.success('Activity logged');
      setShowActivityModal(false);
      setActivityForm({ activityType: 'Call', description: '', outcome: '', nextAction: '' });
      loadLead();
    } catch (error) {
      toast.error('Failed to log activity');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!lead) return null;

  const overdueFollowUp = lead.nextFollowUpDate && isOverdue(lead.nextFollowUpDate) &&
    !['Closed Won', 'Closed Lost', 'Not Interested'].includes(lead.currentStatus);

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(false)} className="p-2 rounded-lg hover:bg-gray-100">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="page-title">Edit: {lead.schoolName}</h1>
        </div>
        <div className="card">
          <LeadForm lead={lead} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/leads" className="p-2 rounded-lg hover:bg-gray-100">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="page-title">{lead.schoolName}</h1>
            <p className="text-sm text-gray-500">{lead.schoolId} • {lead.territory} • {lead.schoolType}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LeadStatusDropdown currentStatus={lead.currentStatus} onChange={handleStatusChange} />
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-1">
            <HiOutlinePencil className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Person Met</p>
                <p className="font-medium">{lead.personMet || '—'}</p>
                <p className="text-sm text-gray-500">{lead.positionTitle}</p>
              </div>
              {lead.phoneNumber && (
                <div className="flex items-center gap-2">
                  <HiOutlinePhone className="w-4 h-4 text-gray-400" />
                  <span>{lead.phoneNumber}</span>
                </div>
              )}
              {lead.emailAddress && (
                <div className="flex items-center gap-2">
                  <HiOutlineMail className="w-4 h-4 text-gray-400" />
                  <span>{lead.emailAddress}</span>
                </div>
              )}
              {lead.address && (
                <div className="flex items-center gap-2">
                  <HiOutlineLocationMarker className="w-4 h-4 text-gray-400" />
                  <span>{lead.address}, {lead.city}, {lead.state}</span>
                </div>
              )}
            </div>
          </div>

          {/* Deal Info */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Deal Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Proposed Price</p>
                <p className="font-semibold">{formatNaira(lead.proposedPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Negotiated Price</p>
                <p className="font-semibold text-primary-600">{formatNaira(lead.negotiatedPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Commission ({lead.commissionPercentage}%)</p>
                <p className="font-semibold text-green-600">{formatNaira(lead.commissionAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Payment Status</p>
                <StatusBadge status={lead.paymentStatus || 'Not Paid'} />
                {lead.amountPaid > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Paid: {formatNaira(lead.amountPaid)}</p>
                )}
              </div>
            </div>

            {lead.proposedPackage && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">Package: <span className="font-medium text-gray-900">{lead.proposedPackage}</span></p>
              </div>
            )}
          </div>

          {/* Follow-up */}
          {lead.nextFollowUpDate && (
            <div className={`card ${overdueFollowUp ? 'border-red-300 bg-red-50' : ''}`}>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <HiOutlineCalendar className="w-5 h-5" />
                Follow-Up
                {overdueFollowUp && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">OVERDUE</span>}
              </h3>
              <p><strong>Date:</strong> {formatDate(lead.nextFollowUpDate)}</p>
              {lead.followUpMethod && <p><strong>Method:</strong> {lead.followUpMethod}</p>}
              {lead.nextMeetingScheduled && lead.nextMeetingDate && (
                <p><strong>Meeting:</strong> {formatDate(lead.nextMeetingDate)}</p>
              )}
            </div>
          )}

          {/* Competition */}
          {(lead.currentSystemUsed || lead.painPoints || lead.competitorMentioned) && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Competitive Intelligence</h3>
              <div className="space-y-2 text-sm">
                {lead.currentSystemUsed && <p><strong>Current System:</strong> {lead.currentSystemUsed}</p>}
                {lead.competitorMentioned && <p><strong>Competitor:</strong> {lead.competitorMentioned}</p>}
                {lead.painPoints && <p><strong>Pain Points:</strong> {lead.painPoints}</p>}
                {lead.decisionTimeline && <p><strong>Decision Timeline:</strong> {lead.decisionTimeline}</p>}
              </div>
            </div>
          )}

          {/* Objections / Notes */}
          {(lead.objectionsRaised || lead.additionalNotes || lead.responseSummary) && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Notes & Objections</h3>
              <div className="space-y-3 text-sm">
                {lead.responseSummary && <div><strong>Response:</strong><p className="text-gray-600 mt-0.5">{lead.responseSummary}</p></div>}
                {lead.objectionsRaised && <div><strong>Objections:</strong><p className="text-gray-600 mt-0.5">{lead.objectionsRaised}</p></div>}
                {lead.additionalNotes && <div><strong>Notes:</strong><p className="text-gray-600 mt-0.5">{lead.additionalNotes}</p></div>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Students</span>
                <span className="font-medium">{lead.numberOfStudents || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Probability</span>
                <span className="font-medium">{lead.probabilityOfClosing || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Relationship</span>
                <span className="font-medium">{lead.relationshipStrength || '—'} / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Date Visited</span>
                <span className="font-medium">{formatDate(lead.dateVisited)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Lead Source</span>
                <span className="font-medium">{lead.leadSource || '—'}</span>
              </div>
              {lead.assignedTo && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Assigned To</span>
                  <span className="font-medium">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Activity</h3>
              <button
                onClick={() => setShowActivityModal(true)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Log
              </button>
            </div>
            <ActivityTimeline activities={activities} />
          </div>
        </div>
      </div>

      {/* Activity Modal */}
      <Modal isOpen={showActivityModal} onClose={() => setShowActivityModal(false)} title="Log Activity">
        <form onSubmit={handleLogActivity} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
            <select
              value={activityForm.activityType}
              onChange={(e) => setActivityForm(prev => ({ ...prev, activityType: e.target.value }))}
              className="input-field"
            >
              {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={activityForm.description}
              onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
              className="input-field"
              rows="2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
            <input
              value={activityForm.outcome}
              onChange={(e) => setActivityForm(prev => ({ ...prev, outcome: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
            <input
              value={activityForm.nextAction}
              onChange={(e) => setActivityForm(prev => ({ ...prev, nextAction: e.target.value }))}
              className="input-field"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">Log Activity</button>
            <button type="button" onClick={() => setShowActivityModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
