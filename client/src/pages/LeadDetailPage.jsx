import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { leadService } from '../services/leadService';
import { userService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/permissions';
import LeadForm from '../components/leads/LeadForm';
import ActivityTimeline from '../components/leads/ActivityTimeline';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import { formatCurrency } from '../utils/formatCurrency';
import { getCachedRateMap, convertToUSD } from '../services/exchangeRateService';
import { formatDate, isOverdue } from '../utils/formatDate';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowLeft, HiOutlinePencil, HiOutlineTrash,
  HiOutlinePhone, HiOutlineMail, HiOutlineLocationMarker,
  HiOutlineCalendar, HiOutlinePlus, HiOutlinePaperClip,
  HiOutlineDownload, HiOutlineX, HiOutlineDocument, HiOutlineBell
} from 'react-icons/hi';

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole, hasPermission } = useAuth();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [reassignForm, setReassignForm] = useState({
    assignedTo: '',
    reason: '',
    commissionSplitEnabled: false,
    originatorCommissionPercentage: 0,
    assigneeCommissionPercentage: 0
  });
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [remindingRep, setRemindingRep] = useState(false);
  const [activityForm, setActivityForm] = useState({
    activityType: 'Call',
    description: '',
    outcome: '',
    nextAction: '',
    followUpDate: '',
    followUpMethod: ''
  });

  // Attachment state
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const attachmentInputRef = useRef(null);
  const [rateMap, setRateMap] = useState(null);

  useEffect(() => {
    loadLead();
    loadActivities();
    getCachedRateMap().then(setRateMap);
  }, [id]);

  useEffect(() => {
    if (user && hasPermission(PERMISSIONS.LEADS_ASSIGN)) {
      loadAssignableUsers();
    }
  }, [user?._id, user?.role]);

  const loadLead = async () => {
    try {
      const { data } = await leadService.getLeadById(id);
      setLead(data);
    } catch (error) {
      toast.error('Failed to load lead');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const { data } = await leadService.getActivities(id);
      setActivities(data);
    } catch (error) {
      console.error('Failed to load activities');
    }
  };

  const loadAssignableUsers = async () => {
    try {
      const { data } = await userService.getAll();
      setUsers((data || []).filter(u => u?.isActive));
    } catch (error) {
      console.error('Failed to load users for reassignment');
    }
  };

  const handleUpdate = async (formData) => {
    try {
      await leadService.updateLead(id, formData);
      toast.success('Lead updated successfully');
      setEditing(false);
      loadLead();
      loadActivities();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update lead');
    }
  };

  const openReassignModal = () => {
    const totalCommission = Number(lead?.commissionPercentage || 0);
    const originatorShare = Number(lead?.originatorCommissionPercentage || 0);
    setReassignForm({
      assignedTo: lead?.assignedTo?._id || '',
      reason: '',
      commissionSplitEnabled: Boolean(lead?.commissionSplitEnabled),
      originatorCommissionPercentage: originatorShare,
      assigneeCommissionPercentage: Math.max(totalCommission - originatorShare, 0)
    });
    setShowReassignModal(true);
  };

  const clampShare = (value, total) => {
    const n = Number(value || 0);
    if (Number.isNaN(n)) return 0;
    if (n < 0) return 0;
    if (n > total) return total;
    return n;
  };

  const handleOriginatorShareChange = (value) => {
    const total = Number(lead?.commissionPercentage || 0);
    const originator = clampShare(value, total);
    setReassignForm((prev) => ({
      ...prev,
      originatorCommissionPercentage: originator,
      assigneeCommissionPercentage: Math.max(total - originator, 0)
    }));
  };

  const handleAssigneeShareChange = (value) => {
    const total = Number(lead?.commissionPercentage || 0);
    const assignee = clampShare(value, total);
    setReassignForm((prev) => ({
      ...prev,
      assigneeCommissionPercentage: assignee,
      originatorCommissionPercentage: Math.max(total - assignee, 0)
    }));
  };

  const handleReassignLead = async (e) => {
    e.preventDefault();
    setReassigning(true);
    try {
      const payload = {
        assignedTo: reassignForm.assignedTo,
        reason: reassignForm.reason,
        commissionSplitEnabled: reassignForm.commissionSplitEnabled,
        originatorCommissionPercentage: Number(reassignForm.originatorCommissionPercentage || 0)
      };
      await leadService.reassignLead(id, payload);
      toast.success('Lead reassigned successfully');
      setShowReassignModal(false);
      await Promise.all([loadLead(), loadActivities()]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reassign lead');
    } finally {
      setReassigning(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await leadService.deleteLead(id);
      toast.success('Lead deleted');
      navigate('/leads');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete lead');
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      await leadService.createActivity({
        leadId: id,
        ...activityForm
      });
      toast.success('Activity logged');
      setShowActivityModal(false);
      setActivityForm({ activityType: 'Call', description: '', outcome: '', nextAction: '', followUpDate: '', followUpMethod: '' });
      loadActivities();
    } catch (error) {
      toast.error('Failed to log activity');
    }
  };

  const handleRemindRep = async () => {
    setRemindingRep(true);
    try {
      const { data } = await leadService.remindLead(id);
      toast.success(data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to send reminder');
    } finally {
      setRemindingRep(false);
    }
  };

  const handleUploadAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAttachmentLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await leadService.addAttachment(id, formData);
      toast.success('File uploaded successfully');
      loadLead(); // Refresh to show new attachment
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setAttachmentLoading(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId, filename) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    try {
      await leadService.deleteAttachment(id, attachmentId);
      toast.success('Attachment deleted');
      loadLead();
    } catch (error) {
      toast.error('Failed to delete attachment');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!lead) return null;

  const cur = lead.currency || 'NGN';
  // Show USD equivalent in grey when lead's currency is not USD
  const usdHint = (amount) => {
    if (!rateMap || !amount || cur === 'USD') return null;
    const usd = convertToUSD(amount, cur, rateMap);
    return <span className="text-xs text-gray-400 ml-1">(≈ {formatCurrency(usd, 'USD')})</span>;
  };

  const overdueFollowUp = lead.nextFollowUpDate && isOverdue(lead.nextFollowUpDate) &&
    !['Closed Won', 'Closed Lost', 'Not Interested'].includes(lead.currentStatus);
  const canReassign = hasPermission(PERMISSIONS.LEADS_ASSIGN);
  const splitEnabled = Boolean(lead.commissionSplitEnabled);
  const originatorPct = Number(lead.originatorCommissionPercentage || 0);
  const assigneePct = Math.max(Number(lead.commissionPercentage || 0) - originatorPct, 0);
  const totalCommissionPool = Number(lead.commissionPercentage || 0);

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(false)} className="p-2 rounded-lg hover:bg-gray-100">
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="page-title">Edit Lead</h1>
        </div>
        <div className="card">
          <LeadForm lead={lead} users={users} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
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
            <p className="text-sm text-gray-500">{lead.schoolId} • {lead.territory}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-1">
            <HiOutlinePencil className="w-4 h-4" />
            Edit
          </button>
          {hasRole('manager', 'admin') && (
            <button onClick={handleDelete} className="btn-danger flex items-center gap-1">
              <HiOutlineTrash className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Pricing */}
          <div className="card">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                <div className="mt-1"><StatusBadge status={lead.currentStatus} /></div>
                {lead.closedAtFollowUp && (
                  <p className="text-xs text-gray-500 mt-1">
                    Closed at follow-up{' '}
                    <span className="font-bold text-gray-700">#{lead.closedAtFollowUp}</span>
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Deal Value</p>
                <p className="text-lg font-bold text-gray-900 mt-1">
                  {formatCurrency(lead.negotiatedPrice || lead.proposedPrice, cur)}
                  {usdHint(lead.negotiatedPrice || lead.proposedPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Probability</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{lead.probabilityOfClosing || 0}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Commission</p>
                <p className="text-lg font-bold text-green-600 mt-1">
                  {lead.commissionPercentage}%{lead.commissionAmount > 0 && ` (${formatCurrency(lead.commissionAmount, lead.currency || 'NGN')})`}
                </p>
              </div>
            </div>
          </div>

          {/* Overdue Alert */}
          {overdueFollowUp && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <HiOutlineCalendar className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Follow-up Overdue!</p>
                <p className="text-sm text-red-600">
                  Was due on {formatDate(lead.nextFollowUpDate)}
                  {lead.followUpMethod && ` via ${lead.followUpMethod}`}
                </p>
              </div>
            </div>
          )}

          {/* School Info */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">School Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Organisation Type:</span>
                <span className="ml-2 font-medium">{lead.schoolType || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Students:</span>
                <span className="ml-2 font-medium">{lead.numberOfStudents?.toLocaleString() || '—'}</span>
              </div>
              <div className="flex items-start gap-1">
                <HiOutlineLocationMarker className="w-4 h-4 text-gray-400 mt-0.5" />
                <span>{[lead.address, lead.city, lead.state, lead.lga].filter(Boolean).join(', ') || '—'}</span>
              </div>
              {lead.country && lead.country !== 'Nigeria' && (
                <div>
                  <span className="text-gray-500">Country:</span>
                  <span className="ml-2 font-medium">{lead.country}</span>
                </div>
              )}
              {lead.country === 'Nigeria' && lead.lga && (
                <div>
                  <span className="text-gray-500">LGA:</span>
                  <span className="ml-2">{lead.lga}</span>
                </div>
              )}
              {lead.website && (
                <div>
                  <span className="text-gray-500">Website:</span>
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary-600 hover:underline">
                    {lead.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Person Met:</span>
                <span className="ml-2 font-medium">{lead.personMet || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Position:</span>
                <span className="ml-2">{lead.positionTitle || '—'}</span>
              </div>
              {lead.phoneNumber && (
                <div className="flex items-center gap-1">
                  <HiOutlinePhone className="w-4 h-4 text-gray-400" />
                  <a href={`tel:${lead.phoneNumber}`} className="text-primary-600">{lead.phoneNumber}</a>
                </div>
              )}
              {lead.emailAddress && (
                <div className="flex items-center gap-1">
                  <HiOutlineMail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${lead.emailAddress}`} className="text-primary-600">{lead.emailAddress}</a>
                </div>
              )}
              {lead.whatsappNumber && (
                <div>
                  <span className="text-gray-500">WhatsApp:</span>
                  <span className="ml-2">{lead.whatsappNumber}</span>
                </div>
              )}
              {lead.gatekeeperName && (
                <div>
                  <span className="text-gray-500">Gatekeeper:</span>
                  <span className="ml-2">{lead.gatekeeperName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Details */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Pricing & Revenue</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Package:</span>
                <span className="ml-2 font-medium">{lead.proposedPackage || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Proposed Price:</span>
                <span className="ml-2">{formatCurrency(lead.proposedPrice, cur)}</span>
                {usdHint(lead.proposedPrice)}
              </div>
              <div>
                <span className="text-gray-500">Negotiated Price:</span>
                <span className="ml-2 font-bold">{formatCurrency(lead.negotiatedPrice, cur)}</span>
                {usdHint(lead.negotiatedPrice)}
              </div>
              <div>
                <span className="text-gray-500">Payment Status:</span>
                <span className={`ml-2 font-medium ${
                  lead.paymentStatus === 'Paid Fully' ? 'text-green-600' :
                  lead.paymentStatus === 'Part Payment' ? 'text-yellow-600' : 'text-red-600'
                }`}>{lead.paymentStatus}</span>
              </div>
              {lead.amountPaid > 0 && (
                <div>
                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="ml-2">{formatCurrency(lead.amountPaid, cur)}</span>
                  {usdHint(lead.amountPaid)}
                </div>
              )}
              {(lead.negotiatedPrice || 0) - (lead.amountPaid || 0) > 0 && (
                <div>
                  <span className="text-gray-500">Outstanding:</span>
                  <span className="ml-2 text-red-600 font-medium">{formatCurrency((lead.negotiatedPrice || 0) - (lead.amountPaid || 0), cur)}</span>
                  {usdHint((lead.negotiatedPrice || 0) - (lead.amountPaid || 0))}
                </div>
              )}
              <div>
                <span className="text-gray-500">Expected Close:</span>
                <span className="ml-2">{formatDate(lead.expectedClosingDate)}</span>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          {(lead.subscriptionType || lead.subscriptionPlan) && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Subscription & Recurring Revenue</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {lead.subscriptionType && (
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium">{lead.subscriptionType}</span>
                  </div>
                )}
                {lead.subscriptionPlan && (
                  <div>
                    <span className="text-gray-500">Plan:</span>
                    <span className="ml-2 font-medium">{lead.subscriptionPlan}</span>
                  </div>
                )}
                {lead.proposedPackage && lead.subscriptionPlan && (() => {
                  const PLAN_ORDER = ['Free', 'Basic', 'Deluxe', 'Premium', 'Enterprise', 'Custom'];
                  const pi = PLAN_ORDER.indexOf(lead.proposedPackage);
                  const ai = PLAN_ORDER.indexOf(lead.subscriptionPlan);
                  const outcome = pi === ai ? 'match' : ai > pi ? 'upgrade' : 'downgrade';
                  return (
                    <div className="col-span-2">
                      <span className="text-gray-500">Plan Outcome:</span>
                      <span className="inline-flex items-center gap-2 ml-2">
                        <span className="font-medium text-gray-600">{lead.proposedPackage}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-gray-900">{lead.subscriptionPlan}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                          outcome === 'match'     ? 'bg-green-100 text-green-700' :
                          outcome === 'upgrade'   ? 'bg-blue-100  text-blue-700'  :
                                                    'bg-yellow-100 text-yellow-700'
                        }`}>
                          {outcome === 'match' ? '✓ Match' : outcome === 'upgrade' ? '↑ Upgrade' : '↓ Downgrade'}
                        </span>
                      </span>
                    </div>
                  );
                })()}
                {lead.storageSize && (
                  <div>
                    <span className="text-gray-500">Storage:</span>
                    <span className="ml-2">{lead.storageSize}</span>
                  </div>
                )}
                {lead.subscriptionStartDate && (
                  <div>
                    <span className="text-gray-500">Start Date:</span>
                    <span className="ml-2">{formatDate(lead.subscriptionStartDate)}</span>
                  </div>
                )}
                {lead.renewalDate && (
                  <div>
                    <span className="text-gray-500">Renewal Date:</span>
                    <span className={`ml-2 font-medium ${
                      new Date(lead.renewalDate) < new Date() ? 'text-red-600' :
                      new Date(lead.renewalDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-yellow-600' : 'text-green-600'
                    }`}>{formatDate(lead.renewalDate)}</span>
                  </div>
                )}
                {lead.renewalDate && (
                  <div>
                    <span className="text-gray-500">Days Until Renewal:</span>
                    <span className="ml-2 font-medium">
                      {Math.ceil((new Date(lead.renewalDate) - new Date()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes & Intelligence */}
          {(lead.responseSummary || lead.objectionsRaised || lead.painPoints || lead.additionalNotes) && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Notes & Intelligence</h3>
              <div className="space-y-3 text-sm">
                {lead.responseSummary && (
                  <div>
                    <p className="text-gray-500 font-medium">Response Summary</p>
                    <p className="mt-1">{lead.responseSummary}</p>
                  </div>
                )}
                {lead.objectionsRaised && (
                  <div>
                    <p className="text-gray-500 font-medium">Objections</p>
                    <p className="mt-1">{lead.objectionsRaised}</p>
                  </div>
                )}
                {lead.painPoints && (
                  <div>
                    <p className="text-gray-500 font-medium">Pain Points</p>
                    <p className="mt-1">{lead.painPoints}</p>
                  </div>
                )}
                {lead.competitorMentioned && (
                  <div>
                    <p className="text-gray-500 font-medium">Competitor</p>
                    <p className="mt-1">{lead.competitorMentioned}</p>
                  </div>
                )}
                {lead.additionalNotes && (
                  <div>
                    <p className="text-gray-500 font-medium">Additional Notes</p>
                    <p className="mt-1">{lead.additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Follow-up Card */}
          <div className={`card ${overdueFollowUp ? 'border-red-200 bg-red-50' : ''}`}>
            <h3 className="text-lg font-semibold mb-3">Follow-Up</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Next Date:</span>
                <span className={`ml-2 font-medium ${overdueFollowUp ? 'text-red-600' : ''}`}>
                  {formatDate(lead.nextFollowUpDate)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Method:</span>
                <span className="ml-2">{lead.followUpMethod || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Meeting:</span>
                <span className="ml-2">{lead.nextMeetingScheduled ? formatDate(lead.nextMeetingDate) : 'None'}</span>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Assignment</h3>
              {canReassign && (
                <button
                  onClick={openReassignModal}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  Reassign
                </button>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Assigned To:</span>
                <span className="ml-2 font-medium">
                  {lead.assignedTo?.firstName} {lead.assignedTo?.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Brought By:</span>
                {lead.createdBy ? (
                  <span className="ml-2 font-medium">
                    {lead.createdBy._id === user?._id
                      ? <span className="text-primary-600">You</span>
                      : `${lead.createdBy.firstName} ${lead.createdBy.lastName}`
                    }
                    {lead.createdBy._id === lead.assignedTo?._id && (
                      <span className="ml-1 text-xs text-gray-400">(same as assigned)</span>
                    )}
                  </span>
                ) : (
                  <span className="ml-2 text-gray-400">—</span>
                )}
              </div>
              <div>
                <span className="text-gray-500">Territory:</span>
                <span className="ml-2">{lead.territory}</span>
              </div>
              <div>
                <span className="text-gray-500">Strength:</span>
                <span className="ml-2">{'★'.repeat(lead.relationshipStrength || 0)}{'☆'.repeat(5 - (lead.relationshipStrength || 0))}</span>
              </div>
              <div>
                <span className="text-gray-500">Commission Split:</span>
                {splitEnabled ? (
                  <span className="ml-2">
                    <span className="font-medium">Assignee {assigneePct}%</span>
                    <span className="text-gray-400"> • </span>
                    <span className="font-medium">Originator {originatorPct}%</span>
                  </span>
                ) : (
                  <span className="ml-2">No split</span>
                )}
              </div>
              {lead.reassignmentHistory?.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-gray-500 mb-1">Reassignment History:</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    {lead.reassignmentHistory.slice().reverse().slice(0, 3).map((item) => (
                      <li key={item._id}>
                        {item.fromUser?.firstName || 'Unknown'} {item.fromUser?.lastName || ''}
                        {' '}→{' '}
                        {item.toUser?.firstName || 'Unknown'} {item.toUser?.lastName || ''}
                        {' · '}
                        {formatDate(item.reassignedAt)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <HiOutlinePaperClip className="w-5 h-5 text-gray-400" />
                Attachments
                {lead.attachments?.length > 0 && (
                  <span className="text-xs text-gray-500 font-normal">({lead.attachments.length})</span>
                )}
              </h3>
              <button
                onClick={() => attachmentInputRef.current?.click()}
                disabled={attachmentLoading}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {attachmentLoading ? <span className="animate-spin">⟳</span> : <HiOutlinePlus className="w-4 h-4" />}
                {attachmentLoading ? 'Uploading...' : 'Add File'}
              </button>
              <input
                ref={attachmentInputRef}
                type="file"
                onChange={handleUploadAttachment}
                className="hidden"
                accept=".pdf,.doc,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.txt"
              />
            </div>

            {(!lead.attachments || lead.attachments.length === 0) ? (
              <p className="text-sm text-gray-400 text-center py-4">No attachments yet</p>
            ) : (
              <ul className="space-y-2">
                {lead.attachments.map((att) => (
                  <li key={att._id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 group">
                    <div className="flex items-center gap-2 min-w-0">
                      <HiOutlineDocument className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{att.originalName}</p>
                        <p className="text-xs text-gray-400">
                          {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : ''}
                          {att.fileSize && att.uploadedAt ? ' · ' : ''}
                          {att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`/${att.filePath?.replace(/\\/g, '/')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-blue-100 text-blue-500"
                        title="Download"
                      >
                        <HiOutlineDownload className="w-4 h-4" />
                      </a>
                      {hasRole('manager', 'admin') && (
                        <button
                          onClick={() => handleDeleteAttachment(att._id, att.originalName)}
                          className="p-1.5 rounded hover:bg-red-100 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete"
                        >
                          <HiOutlineX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Activity Log */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Activity Log</h3>
              <div className="flex items-center gap-2">
                {hasRole('manager', 'admin') && lead.assignedTo && (
                  <button
                    onClick={handleRemindRep}
                    disabled={remindingRep}
                    className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1 disabled:opacity-50"
                    title={`Send follow-up reminder to ${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`}
                  >
                    <HiOutlineBell className="w-4 h-4" />
                    {remindingRep ? 'Sending…' : 'Remind Rep'}
                  </button>
                )}
                <button
                  onClick={() => setShowActivityModal(true)}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                >
                  <HiOutlinePlus className="w-4 h-4" />
                  Log Activity
                </button>
              </div>
            </div>
            <ActivityTimeline activities={activities} />
          </div>
        </div>
      </div>

      <Modal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        title="Reassign Lead"
      >
        <form onSubmit={handleReassignLead} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
            <select
              value={reassignForm.assignedTo}
              onChange={(e) => setReassignForm(prev => ({ ...prev, assignedTo: e.target.value }))}
              className="input-field"
              required
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              value={reassignForm.reason}
              onChange={(e) => setReassignForm(prev => ({ ...prev, reason: e.target.value }))}
              className="input-field"
              placeholder="e.g. Territory handover"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={reassignForm.commissionSplitEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                if (!checked) {
                  setReassignForm((prev) => ({
                    ...prev,
                    commissionSplitEnabled: false,
                    originatorCommissionPercentage: 0,
                    assigneeCommissionPercentage: totalCommissionPool
                  }));
                  return;
                }
                setReassignForm((prev) => ({
                  ...prev,
                  commissionSplitEnabled: true,
                  assigneeCommissionPercentage: Math.max(totalCommissionPool - Number(prev.originatorCommissionPercentage || 0), 0)
                }));
              }}
              className="rounded"
            />
            Split commission with lead originator
          </label>

          {reassignForm.commissionSplitEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Originator Share (%)</label>
                <input
                  type="number"
                  min="0"
                  max={totalCommissionPool}
                  value={reassignForm.originatorCommissionPercentage}
                  onChange={(e) => handleOriginatorShareChange(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee Share (%)</label>
                <input
                  type="number"
                  min="0"
                  max={totalCommissionPool}
                  value={reassignForm.assigneeCommissionPercentage}
                  onChange={(e) => handleAssigneeShareChange(e.target.value)}
                  className="input-field"
                />
              </div>
              <p className="text-xs text-gray-500 md:col-span-2">
                Total commission pool: {totalCommissionPool}% (remaining is auto-assigned to the other person)
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" disabled={reassigning} className="btn-primary">
              {reassigning ? 'Saving...' : 'Save Reassignment'}
            </button>
            <button type="button" onClick={() => setShowReassignModal(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Activity Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="Log Activity"
      >
        <form onSubmit={handleAddActivity} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
            <select
              value={activityForm.activityType}
              onChange={(e) => setActivityForm(prev => ({ ...prev, activityType: e.target.value }))}
              className="input-field"
            >
              {['Call', 'Email', 'WhatsApp', 'Visit', 'Demo', 'Proposal Sent', 'Note Added'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={activityForm.description}
              onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
              className="input-field"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Action / Notes</label>
            <input
              value={activityForm.nextAction}
              onChange={(e) => setActivityForm(prev => ({ ...prev, nextAction: e.target.value }))}
              className="input-field"
              placeholder="e.g. Send pricing sheet, book demo..."
            />
          </div>

          {/* Follow-up scheduling */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Schedule Next Follow-up</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={activityForm.followUpDate}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, followUpDate: e.target.value }))}
                  className="input-field"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
                <select
                  value={activityForm.followUpMethod}
                  onChange={(e) => setActivityForm(prev => ({ ...prev, followUpMethod: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Select method</option>
                  {['Call', 'WhatsApp', 'Email', 'Physical Visit'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
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
