import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import {
  LEAD_STATUSES, SCHOOL_TYPES,
  FOLLOW_UP_METHODS, PAYMENT_STATUSES,
  SUBSCRIPTION_TYPES, SUBSCRIPTION_PLANS, STORAGE_SIZES
} from '../../utils/constants';
import { NIGERIAN_STATES, getLgasByState } from '../../utils/nigerianStatesLgas';
import { COUNTRY_NAMES, getCurrencyByCountry, isNigeria } from '../../utils/countries';
import { getCurrencySymbol, formatCurrency } from '../../utils/formatCurrency';
import { getCachedRateMap, convertToUSD } from '../../services/exchangeRateService';
import { getStatesByCountry, getCitiesByState, prewarmStates } from '../../services/geoService';

const initialFormData = {
  schoolName: '', schoolType: '', address: '', city: '', state: '',
  website: '', numberOfStudents: '',
  country: 'Nigeria', currency: 'NGN', region: '',
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
  assignedTo: '', lga: '',
  subscriptionType: '', subscriptionStartDate: '', renewalDate: '',
  subscriptionPlan: '', storageSize: ''
};

export default function LeadForm({ lead, onSubmit, onCancel, users = [] }) {
  const { user, hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole('admin');
  const isAdminOrManager = hasRole('admin', 'manager', 'bursar');
  
  // Permission checks
  const canEditCommission = hasPermission(PERMISSIONS.LEADS_EDIT_COMMISSION);
  const canEditPayment = hasPermission(PERMISSIONS.LEADS_EDIT_PAYMENT);
  const canAssignLeads = hasPermission(PERMISSIONS.LEADS_ASSIGN);
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [rateMap, setRateMap] = useState(null);

  // Dynamic geo state
  const [foreignStates, setForeignStates]   = useState([]);
  const [foreignCities, setForeignCities]   = useState([]);
  const [statesLoading, setStatesLoading]   = useState(false);
  const [citiesLoading, setCitiesLoading]   = useState(false);

  // Load exchange rates once for live USD conversion hints
  useEffect(() => { getCachedRateMap().then(setRateMap); }, []);

  useEffect(() => {
    if (lead) {
      const data = { ...initialFormData };
      Object.keys(data).forEach(key => {
        if (lead[key] !== undefined && lead[key] !== null) {
          if (key === 'assignedTo' && typeof lead[key] === 'object') {
            data[key] = lead[key]._id;
          } else if (['dateVisited', 'nextFollowUpDate', 'nextMeetingDate', 'expectedClosingDate', 'subscriptionStartDate', 'renewalDate'].includes(key) && lead[key]) {
            data[key] = new Date(lead[key]).toISOString().split('T')[0];
          } else {
            data[key] = lead[key];
          }
        }
      });
      setFormData(data);
      // Pre-load geo data if editing a non-Nigeria lead
      if (lead.country && !isNigeria(lead.country)) {
        loadForeignStates(lead.country, lead.state);
      }
    } else {
      setFormData({
        ...initialFormData,
        territory: user?.territory || '',
        assignedTo: user?._id || '',
        commissionPercentage: user?.defaultCommissionRate || 25
      });
    }
  }, [lead, user]);

  // Fetch states for a foreign country; optionally also load cities for a preselected state
  const loadForeignStates = async (country, existingState) => {
    setStatesLoading(true);
    setForeignStates([]);
    setForeignCities([]);
    const states = await getStatesByCountry(country);
    setForeignStates(states);
    setStatesLoading(false);
    if (existingState && states.includes(existingState)) {
      loadForeignCities(country, existingState);
    }
  };

  // Fetch cities for a foreign country + state
  const loadForeignCities = async (country, state) => {
    setCitiesLoading(true);
    setForeignCities([]);
    const cities = await getCitiesByState(country, state);
    setForeignCities(cities);
    setCitiesLoading(false);
  };

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

  // Helper: show ≈ $X USD hint when price is non-USD currency
  const usdPreview = (amount) => {
    if (!rateMap || !amount || formData.currency === 'USD') return null;
    const n = Number(amount);
    if (!n) return null;
    return (
      <p className="text-xs text-blue-500 mt-0.5">
        ≈ {formatCurrency(convertToUSD(n, formData.currency, rateMap), 'USD')}
      </p>
    );
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Organisation Type</label>
          <select name="schoolType" value={formData.schoolType} onChange={handleChange} className="input-field">
            <option value="">Select Type</option>
            {SCHOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Number of Students</label>
          <input type="number" name="numberOfStudents" value={formData.numberOfStudents} onChange={handleChange} className="input-field" />
        </div>
        {/* Country selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <select
            name="country"
            value={formData.country}
            onChange={e => {
              const selectedCountry = e.target.value;
              const { code } = getCurrencyByCountry(selectedCountry);
              setFormData(prev => ({
                ...prev,
                country: selectedCountry,
                currency: code,
                state: '',
                territory: '',
                lga: '',
                region: '',
                city: ''
              }));
              setForeignStates([]);
              setForeignCities([]);
              if (selectedCountry && !isNigeria(selectedCountry)) {
                loadForeignStates(selectedCountry, '');
              }
            }}
            className="input-field"
          >
            <option value="">Select Country</option>
            {COUNTRY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {/* City — always visible; dynamic when state is selected for non-Nigeria */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          {!isNigeria(formData.country) && foreignCities.length > 0 ? (
            <select
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">{citiesLoading ? 'Loading cities…' : 'Select City'}</option>
              {foreignCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="input-field"
              placeholder={citiesLoading ? 'Loading…' : 'Enter city'}
            />
          )}
        </div>
        {/* Nigeria: State + LGA dropdowns. Others: dynamic state + city from CountriesNow API */}
        {isNigeria(formData.country) ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                name="state"
                value={formData.state}
                onChange={e => {
                  const selectedState = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    state: selectedState,
                    territory: selectedState,
                    lga: ''
                  }));
                }}
                className="input-field"
              >
                <option value="">Select State</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
              <select
                name="lga"
                value={formData.lga}
                onChange={handleChange}
                className="input-field"
                disabled={!formData.state}
              >
                <option value="">{formData.state ? 'Select LGA' : 'Select state first'}</option>
                {getLgasByState(formData.state).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State / Region / Province
              {statesLoading && <span className="ml-2 text-xs text-blue-500">Loading…</span>}
            </label>
            {foreignStates.length > 0 ? (
              <select
                name="state"
                value={formData.state}
                onChange={e => {
                  const selectedState = e.target.value;
                  setFormData(prev => ({
                    ...prev,
                    state: selectedState,
                    territory: selectedState,
                    region: selectedState,
                    city: ''
                  }));
                  if (selectedState) loadForeignCities(formData.country, selectedState);
                  else setForeignCities([]);
                }}
                className="input-field"
              >
                <option value="">Select State / Region</option>
                {foreignStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                name="region"
                value={formData.region || formData.state}
                onChange={e => setFormData(prev => ({ ...prev, region: e.target.value, state: e.target.value, territory: e.target.value }))}
                className="input-field"
                placeholder={statesLoading ? 'Loading…' : 'e.g., Lagos, Greater Accra'}
                disabled={statesLoading}
              />
            )}
          </div>
        )}
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
          <select name="proposedPackage" value={formData.proposedPackage} onChange={handleChange} className="input-field">
            <option value="">Select Package</option>
            {SUBSCRIPTION_PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Price ({getCurrencySymbol(formData.currency)})</label>
          <input type="number" name="proposedPrice" value={formData.proposedPrice} onChange={handleChange} className="input-field" />
          {usdPreview(formData.proposedPrice)}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Negotiated Price ({getCurrencySymbol(formData.currency)})</label>
          <input type="number" name="negotiatedPrice" value={formData.negotiatedPrice} onChange={handleChange} className="input-field" />
          {usdPreview(formData.negotiatedPrice)}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Closing Date</label>
          <input type="date" name="expectedClosingDate" value={formData.expectedClosingDate} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
          {isAdminOrManager ? (
            <select name="paymentStatus" value={formData.paymentStatus} onChange={handleChange} className="input-field">
              {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input value={formData.paymentStatus} disabled className="input-field bg-gray-100 cursor-not-allowed" />
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid ({getCurrencySymbol(formData.currency)})</label>
          {isAdminOrManager ? (
            <>
              <input type="number" name="amountPaid" value={formData.amountPaid} onChange={handleChange} className="input-field" />
              {usdPreview(formData.amountPaid)}
            </>
          ) : (
            <input type="number" value={formData.amountPaid} disabled className="input-field bg-gray-100 cursor-not-allowed" />
          )}
        </div>
      </Section>

      <Section title="Commission & Assignment">
        {isAdminOrManager ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
            <input
              type="number" min="0" max="100"
              name="commissionPercentage"
              value={formData.commissionPercentage}
              onChange={handleChange}
              className="input-field"
            />
            {formData.negotiatedPrice > 0 && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                Commission value: {getCurrencySymbol(formData.currency)}
                {((Number(formData.negotiatedPrice) * Number(formData.commissionPercentage)) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">Default from rep profile: {formData.commissionPercentage}%</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
            <input type="number" value={formData.commissionPercentage} disabled className="input-field bg-gray-100 cursor-not-allowed" />
            {formData.negotiatedPrice > 0 && (
              <p className="text-xs text-green-600 mt-1 font-medium">
                = {getCurrencySymbol(formData.currency)}
                {((Number(formData.negotiatedPrice) * Number(formData.commissionPercentage)) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Strength (1-5)</label>
          <input type="number" min="1" max="5" name="relationshipStrength" value={formData.relationshipStrength} onChange={handleChange} className="input-field" />
        </div>
        {isAdminOrManager && users.length > 0 && (
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

      <Section title="Subscription & Recurring Revenue">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Type</label>
          <select name="subscriptionType" value={formData.subscriptionType} onChange={handleChange} className="input-field">
            <option value="">Select Type</option>
            {SUBSCRIPTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
          <select name="subscriptionPlan" value={formData.subscriptionPlan} onChange={handleChange} className="input-field">
            <option value="">Select Plan</option>
            {SUBSCRIPTION_PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Storage Size</label>
          <select name="storageSize" value={formData.storageSize} onChange={handleChange} className="input-field">
            <option value="">Select Size</option>
            {STORAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Start Date</label>
          <input type="date" name="subscriptionStartDate" value={formData.subscriptionStartDate} onChange={handleChange} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
          <input type="date" name="renewalDate" value={formData.renewalDate} onChange={handleChange} className="input-field" />
        </div>
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
