import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LEAD_STATUSES, TERRITORIES, SCHOOL_TYPES,
  FOLLOW_UP_METHODS, PAYMENT_STATUSES
} from '../../utils/constants';

const initialFormData = {
  schoolName: '', schoolType: '', address: '', city: '', state: '',
  website: '', numberOfStudents: '',
  dateVisited: '', timeVisited: '', purposeOfVisit: '', leadSource: '',
  personMet: '', positionTitle: '', phoneNumber: '', emailAddress: '',
  whatsappNumber: '', gatekeeperName: '',
  currentStatus: 'Interested', responseSummary: '', objectionsRaised: '',
  nextFollowUpDate: '', followUpMethod: '', nextMeetingScheduled: false,
  nextMeetingDate: '', reminderSet: false,
  proposedPackage: '', proposedPrice: '', negotiatedPrice: '',
  expectedClosingDate: '', paymentStatus: 'Not Paid', amountPaid: '',
  currentSystemUsed: '', painPoints: '', decisionTimeline: '', competitorMentioned: '',
  relationshipStrength: '', probabilityOfClosing: '',
  commissionPercentage: 25, territory: '', additionalNotes: '',
  assignedTo: ''
};

export default function LeadForm({ lead, onSubmit, onCancel, users = [] }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lead) {
      const data = { ...initialFormData };
      Object.keys(data).forEach(key => {
        if (lead[key] !== undefined && lead[key] !== null) {
          if (key === 'assignedTo' && typeof lead[key] === 'object') {
            data[key] = lead[key]._id;
          } else if (['dateVisited', 'nextFollowUpDate', 'nextMeetingDate', 'expectedClosingDate'].includes(key) && lead[key]) {
            data[key] = new Date(lead[key]).toISOString().split('T')[0];
          } else {
            data[key] = lead[key];
          }
        }
      });
      setFormData(data);
    } else {
      setFormData({
        ...initialFormData,
        territory: user?.territory || '',
        assignedTo: user?._id || '',
        commissionPercentage: user?.defaultCommissionRate || 25
      });
    }
  }, [lead, user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const submitData = { ...formData };
      // Convert numeric fields
      ['numberOfStudents', 'proposedPrice', 'negotiatedPrice', 'amountPaid',
        'relationshipStrength', 'probabilityOfClosing', 'commissionPercentage'].forEach(field => {
        if (submitData[field] !== '' && submitData[field] !== undefined) {
          submitData[field] = Number(submitData[field]);
        }
      });
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  const Section = ({ title, children }) => (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Section title="School Information">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
          <input name="schoolName" value={formData.schoolName} onChange={handleChange} required className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">School Type</label>
          <select name="schoolType" value={formData.schoolType} onChange={handleChange} className="input-field">
            <option value="">Select Type</option>
            {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Students</label>
          <input type="number" name="numberOfStudents" value={formData.numberOfStudents} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input name="city" value={formData.city} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input name="state" value={formData.state} onChange={handleChange} className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input name="address" value={formData.address} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
          <input name="website" value={formData.website} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
          <input name="leadSource" value={formData.leadSource} onChange={handleChange} className="input-field" placeholder="e.g., Referral, Cold Call, Conference" />
        </div>
      </Section>

      <Section title="Contact Information">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Person Met</label>
          <input name="personMet" value={formData.personMet} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Position/Title</label>
          <input name="positionTitle" value={formData.positionTitle} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input type="email" name="emailAddress" value={formData.emailAddress} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number</label>
          <input name="whatsappNumber" value={formData.whatsappNumber} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gatekeeper Name</label>
          <input name="gatekeeperName" value={formData.gatekeeperName} onChange={handleChange} className="input-field" />
        </div>
      </Section>

      <Section title="Visit & Pipeline">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Visited</label>
          <input type="date" name="dateVisited" value={formData.dateVisited} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Visit</label>
          <input name="purposeOfVisit" value={formData.purposeOfVisit} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
          <select name="currentStatus" value={formData.currentStatus} onChange={handleChange} className="input-field">
            {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Probability of Closing (%)</label>
          <input type="number" min="0" max="100" name="probabilityOfClosing" value={formData.probabilityOfClosing} onChange={handleChange} className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Response Summary</label>
          <textarea name="responseSummary" value={formData.responseSummary} onChange={handleChange} rows="2" className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Objections Raised</label>
          <textarea name="objectionsRaised" value={formData.objectionsRaised} onChange={handleChange} rows="2" className="input-field" />
        </div>
      </Section>

      <Section title="Follow-Up">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Next Follow-Up Date</label>
          <input type="date" name="nextFollowUpDate" value={formData.nextFollowUpDate} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Follow-Up Method</label>
          <select name="followUpMethod" value={formData.followUpMethod} onChange={handleChange} className="input-field">
            <option value="">Select Method</option>
            {FOLLOW_UP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="nextMeetingScheduled" checked={formData.nextMeetingScheduled} onChange={handleChange} className="rounded" />
            <span className="text-sm text-gray-700">Meeting Scheduled</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="reminderSet" checked={formData.reminderSet} onChange={handleChange} className="rounded" />
            <span className="text-sm text-gray-700">Reminder Set</span>
          </label>
        </div>
        {formData.nextMeetingScheduled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Date</label>
            <input type="date" name="nextMeetingDate" value={formData.nextMeetingDate} onChange={handleChange} className="input-field" />
          </div>
        )}
      </Section>

      <Section title="Pricing & Revenue">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Package</label>
          <input name="proposedPackage" value={formData.proposedPackage} onChange={handleChange} className="input-field" placeholder="e.g., Basic, Premium, Enterprise" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Price (₦)</label>
          <input type="number" name="proposedPrice" value={formData.proposedPrice} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Negotiated Price (₦)</label>
          <input type="number" name="negotiatedPrice" value={formData.negotiatedPrice} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Closing Date</label>
          <input type="date" name="expectedClosingDate" value={formData.expectedClosingDate} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
          <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className="input-field">
            {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₦)</label>
          <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} className="input-field" />
        </div>
      </Section>

      <Section title="Commission & Assignment">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
          <input type="number" min="0" max="100" name="commissionPercentage" value={formData.commissionPercentage} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Territory</label>
          <select name="territory" value={formData.territory} onChange={handleChange} className="input-field">
            <option value="">Select Territory</option>
            {TERRITORIES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Strength (1-5)</label>
          <input type="number" min="1" max="5" name="relationshipStrength" value={formData.relationshipStrength} onChange={handleChange} className="input-field" />
        </div>
        {users.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} className="input-field">
              <option value="">Select User</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </div>
        )}
      </Section>

      <Section title="Competitive Intelligence">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current System Used</label>
          <input name="currentSystemUsed" value={formData.currentSystemUsed} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Competitor Mentioned</label>
          <input name="competitorMentioned" value={formData.competitorMentioned} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Decision Timeline</label>
          <input name="decisionTimeline" value={formData.decisionTimeline} onChange={handleChange} className="input-field" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Pain Points</label>
          <textarea name="painPoints" value={formData.painPoints} onChange={handleChange} rows="2" className="input-field" />
        </div>
      </Section>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
        <textarea name="additionalNotes" value={formData.additionalNotes} onChange={handleChange} rows="3" className="input-field" />
      </div>

      <div className="flex items-center gap-3 pt-4 border-t">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : lead ? 'Update Lead' : 'Create Lead'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        )}
      </div>
    </form>
  );
}
