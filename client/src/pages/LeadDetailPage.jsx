import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { leadService } from '../services/leadService';
import { useAuth } from '../context/AuthContext';
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
  HiOutlineDownload, HiOutlineX, HiOutlineDocument
} from 'react-icons/hi';

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
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

  // Attachment state
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const attachmentInputRef = useRef(null);
  const [rateMap, setRateMap] = useState(null);

  useEffect(() => {
    loadLead();
    loadActivities();
    getCachedRateMap().then(setRateMap);
  }, [id]);

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
      setActivityForm({ activityType: 'Call', description: '', outcome: '', nextAction: '' });
      loadActivities();
    } catch (error) {
      toast.error('Failed to log activity');
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
            <h3 className="text-lg font-semibold mb-3">Assignment</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Assigned To:</span>
                <span className="ml-2 font-medium">
                  {lead.assignedTo?.firstName} {lead.assignedTo?.lastName}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Territory:</span>
                <span className="ml-2">{lead.territory}</span>
              </div>
              <div>
                <span className="text-gray-500">Strength:</span>
                <span className="ml-2">{'★'.repeat(lead.relationshipStrength || 0)}{'☆'.repeat(5 - (lead.relationshipStrength || 0))}</span>
              </div>
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
              <button
                onClick={() => setShowActivityModal(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Log Activity
              </button>
            </div>
            <ActivityTimeline activities={activities} />
          </div>
        </div>
      </div>

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
