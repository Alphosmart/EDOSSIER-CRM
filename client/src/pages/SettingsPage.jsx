import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import toast from 'react-hot-toast';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineCurrencyDollar, HiOutlineCheck, HiOutlinePencil, HiOutlineGlobe, HiOutlineTrash, HiOutlineRefresh, HiOutlineCheckCircle } from 'react-icons/hi';
import { exchangeRateService, invalidateRateCache } from '../services/exchangeRateService';

export default function SettingsPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const canManageRates = hasRole('manager') || hasRole('admin');
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState('profile');

  // Auto-select tab from query param (e.g. /settings?tab=commission)
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'commission' && isAdmin) setTab('commission');
  }, [searchParams, isAdmin]);
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState([]);
  const [exRatesLoading, setExRatesLoading] = useState(false);
  const [syncingRates, setSyncingRates] = useState(false);
  const [editingExRate, setEditingExRate] = useState({}); // { currency: { rate, description } }
  const [savingExRate, setSavingExRate] = useState({});
  const [newRate, setNewRate] = useState({ currency: '', rate: '', description: '' });
  const [addingNewRate, setAddingNewRate] = useState(false);

  // Commission rates state
  const [users, setUsers] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [editingRate, setEditingRate] = useState({}); // { userId: rateValue }
  const [savingRate, setSavingRate] = useState({}); // { userId: bool }

  useEffect(() => {
    if (tab === 'commission' && isAdmin) {
      loadUsers();
    }
    if (tab === 'exchangeRates' && canManageRates) {
      loadExchangeRates();
    }
  }, [tab]);

  const loadExchangeRates = async () => {
    setExRatesLoading(true);
    try {
      const { data } = await exchangeRateService.getRates();
      setExchangeRates(data);
    } catch {
      toast.error('Failed to load exchange rates');
    } finally {
      setExRatesLoading(false);
    }
  };

  const startEditExRate = (rate) => {
    setEditingExRate(prev => ({
      ...prev,
      [rate.currency]: { rate: rate.rateToNGN, description: rate.description || '' }
    }));
  };

  const cancelEditExRate = (currency) => {
    setEditingExRate(prev => { const n = { ...prev }; delete n[currency]; return n; });
  };

  const saveExRate = async (currency) => {
    const { rate, description } = editingExRate[currency];
    const rateNum = parseFloat(rate);
    if (isNaN(rateNum) || rateNum <= 0) {
      toast.error('Rate must be a positive number');
      return;
    }
    setSavingExRate(prev => ({ ...prev, [currency]: true }));
    try {
      await exchangeRateService.upsertRate(currency, rateNum, description);
      setExchangeRates(prev => prev.map(r =>
        r.currency === currency
          ? { ...r, rateToNGN: rateNum, description, lastUpdated: new Date().toISOString(), source: 'manual' }
          : r
      ));
      invalidateRateCache();
      cancelEditExRate(currency);
      toast.success(`${currency} rate updated`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update rate');
    } finally {
      setSavingExRate(prev => ({ ...prev, [currency]: false }));
    }
  };

  const syncRatesNow = async () => {
    setSyncingRates(true);
    try {
      const { data } = await exchangeRateService.refreshRates();
      toast.success(`Live sync complete — ${data.updated} rates updated`);
      invalidateRateCache();
      await loadExchangeRates(); // reload to show new values + timestamps
    } catch (err) {
      toast.error(err.response?.data?.message || 'Live sync failed — check your internet connection');
    } finally {
      setSyncingRates(false);
    }
  };

  const deleteExRate = async (currency) => {
    if (!window.confirm(`Remove ${currency} from exchange rates?`)) return;
    try {
      await exchangeRateService.deleteRate(currency);
      setExchangeRates(prev => prev.filter(r => r.currency !== currency));
      toast.success(`${currency} removed`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete rate');
    }
  };

  const handleAddNewRate = async (e) => {
    e.preventDefault();
    const currency = newRate.currency.trim().toUpperCase();
    const rateNum = parseFloat(newRate.rate);
    if (!currency || currency.length < 2 || currency.length > 4) {
      toast.error('Currency code must be 2–4 letters');
      return;
    }
    if (isNaN(rateNum) || rateNum <= 0) {
      toast.error('Rate must be a positive number');
      return;
    }
    setAddingNewRate(true);
    try {
      await exchangeRateService.upsertRate(currency, rateNum, newRate.description);
      await loadExchangeRates();
      setNewRate({ currency: '', rate: '', description: '' });
      toast.success(`${currency} rate added`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add rate');
    } finally {
      setAddingNewRate(false);
    }
  };

  const loadUsers = async () => {
    setRatesLoading(true);
    try {
      const { data } = await userService.getAll();
      setUsers(data.filter(u => u.isActive));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setRatesLoading(false);
    }
  };

  const startEdit = (userId, currentRate) => {
    setEditingRate(prev => ({ ...prev, [userId]: currentRate ?? '' }));
  };

  const cancelEdit = (userId) => {
    setEditingRate(prev => { const n = { ...prev }; delete n[userId]; return n; });
  };

  const saveRate = async (userId) => {
    const rate = parseFloat(editingRate[userId]);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Rate must be between 0 and 100');
      return;
    }
    setSavingRate(prev => ({ ...prev, [userId]: true }));
    try {
      await userService.setCommissionRate(userId, rate);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, defaultCommissionRate: rate } : u));
      cancelEdit(userId);
      toast.success('Commission rate updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update rate');
    } finally {
      setSavingRate(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword(passwords.currentPassword, passwords.newPassword);
      toast.success('Password changed successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const ROLE_LABELS = {
    admin: 'Admin',
    manager: 'Manager',
    team_lead: 'Team Lead',
    sales_rep: 'Sales Rep',
  };

  return (
    <div className="space-y-6">
      <h1 className="page-title">Settings</h1>

      <div className="flex gap-2 border-b pb-2 flex-wrap">
        <button
          onClick={() => setTab('profile')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
            tab === 'profile' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'
          }`}
        >
          <HiOutlineUser className="w-4 h-4" /> Profile
        </button>
        <button
          onClick={() => setTab('security')}
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
            tab === 'security' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'
          }`}
        >
          <HiOutlineLockClosed className="w-4 h-4" /> Security
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab('commission')}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
              tab === 'commission' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'
            }`}
          >
            <HiOutlineCurrencyDollar className="w-4 h-4" /> Commission Rates
          </button>
        )}
        {canManageRates && (
          <button
            onClick={() => setTab('exchangeRates')}
            className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
              tab === 'exchangeRates' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'
            }`}
          >
            <HiOutlineGlobe className="w-4 h-4" /> Exchange Rates
          </button>
        )}
      </div>

      {tab === 'profile' && (
        <div className="card max-w-xl">
          <h2 className="text-lg font-semibold mb-6">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <div>
                <p className="text-lg font-semibold">{user?.firstName} {user?.lastName}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-500">First Name</label>
                <p className="text-gray-900 font-medium">{user?.firstName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Last Name</label>
                <p className="text-gray-900 font-medium">{user?.lastName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Role</label>
                <p className="capitalize text-gray-900">{user?.role?.replace('_', ' ')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Territory</label>
                <p className="text-gray-900">{user?.territory || 'Not assigned'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                  user?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="card max-w-xl">
          <h2 className="text-lg font-semibold mb-6">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
                className="input-field"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="input-field"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* ── Commission Rates (admin only) ── */}
      {tab === 'commission' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Commission Rates</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Set the default commission percentage for each team member. This rate is applied automatically when a lead is closed won.
              </p>
            </div>
            <button onClick={loadUsers} className="btn-secondary text-sm">Refresh</button>
          </div>

          {ratesLoading ? (
            <div className="card py-10 text-center text-gray-400">Loading…</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Territory</th>
                    <th className="px-4 py-3 w-40">Commission Rate (%)</th>
                    <th className="px-4 py-3 w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.length === 0 && (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
                  )}
                  {users.map(u => {
                    const editing = editingRate[u._id] !== undefined;
                    const saving = savingRate[u._id];
                    return (
                      <tr key={u._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">
                          {u.firstName} {u.lastName}
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                            {ROLE_LABELS[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.territory || '—'}</td>
                        <td className="px-4 py-3">
                          {editing ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              value={editingRate[u._id]}
                              onChange={e => setEditingRate(prev => ({ ...prev, [u._id]: e.target.value }))}
                              className="input-field w-24 py-1 text-sm"
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold text-primary-700">
                              {u.defaultCommissionRate ?? 0}%
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editing ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveRate(u._id)}
                                disabled={saving}
                                className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1"
                              >
                                <HiOutlineCheck className="w-3 h-3" />
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => cancelEdit(u._id)}
                                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(u._id, u.defaultCommissionRate ?? 0)}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 flex items-center gap-1"
                            >
                              <HiOutlinePencil className="w-3 h-3" />
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Note: Changing a user's default rate affects new leads only. Existing commission payouts are not retroactively updated.
          </p>
        </div>
      )}

      {/* ── Exchange Rates (admin + manager) ── */}
      {tab === 'exchangeRates' && canManageRates && (
        <div className="space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">Exchange Rates to NGN</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Rates are auto-synced every 6 hours from{' '}
                <a href="https://open.er-api.com" target="_blank" rel="noreferrer"
                   className="text-primary-600 hover:underline">open.er-api.com</a>.
                You can also edit any rate manually — it will be overwritten on the next auto-sync.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={syncRatesNow}
                disabled={syncingRates}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <HiOutlineRefresh className={`w-4 h-4 ${syncingRates ? 'animate-spin' : ''}`} />
                {syncingRates ? 'Syncing…' : 'Sync Now'}
              </button>
              <button onClick={loadExchangeRates} className="btn-secondary text-sm">Reload</button>
            </div>
          </div>

          {exRatesLoading ? (
            <div className="card py-10 text-center text-gray-400">Loading…</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3 w-24">Currency</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 w-44">Rate to NGN (1 unit)</th>
                    <th className="px-4 py-3 w-36">Source</th>
                    <th className="px-4 py-3 w-44">Last Updated</th>
                    <th className="px-4 py-3 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exchangeRates.length === 0 && (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No rates found</td></tr>
                  )}
                  {exchangeRates.map(r => {
                    const editing = editingExRate[r.currency];
                    const saving = savingExRate[r.currency];
                    return (
                      <tr key={r.currency} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-bold text-primary-700">{r.currency}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {editing ? (
                            <input
                              type="text"
                              value={editing.description}
                              onChange={e => setEditingExRate(prev => ({ ...prev, [r.currency]: { ...prev[r.currency], description: e.target.value } }))}
                              className="input-field py-1 text-sm"
                              placeholder="e.g. US Dollar"
                            />
                          ) : (r.description || '—')}
                        </td>
                        <td className="px-4 py-3">
                          {editing ? (
                            <input
                              type="number"
                              min="0.0001"
                              step="any"
                              value={editing.rate}
                              onChange={e => setEditingExRate(prev => ({ ...prev, [r.currency]: { ...prev[r.currency], rate: e.target.value } }))}
                              className="input-field w-32 py-1 text-sm"
                              autoFocus
                            />
                          ) : (
                            <span className="font-semibold">₦{r.rateToNGN?.toLocaleString()}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {r.source === 'auto' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              <HiOutlineCheckCircle className="w-3 h-3" /> Live
                            </span>
                          ) : r.source === 'manual' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                              <HiOutlinePencil className="w-3 h-3" /> Manual
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {r.lastUpdated
                            ? new Date(r.lastUpdated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {editing ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveExRate(r.currency)}
                                disabled={saving}
                                className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 flex items-center gap-1"
                              >
                                <HiOutlineCheck className="w-3 h-3" />
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => cancelEditExRate(r.currency)}
                                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => startEditExRate(r)}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 flex items-center gap-1"
                              >
                                <HiOutlinePencil className="w-3 h-3" /> Edit
                              </button>
                              {isAdmin && r.currency !== 'NGN' && (
                                <button
                                  onClick={() => deleteExRate(r.currency)}
                                  className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center gap-1"
                                >
                                  <HiOutlineTrash className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add new rate */}
          {isAdmin && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Add / Update Currency</h3>
              <form onSubmit={handleAddNewRate} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Code</label>
                  <input
                    type="text"
                    placeholder="USD"
                    maxLength={4}
                    value={newRate.currency}
                    onChange={e => setNewRate(prev => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                    className="input-field w-24 py-1.5 text-sm uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Rate to NGN</label>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    placeholder="1650"
                    value={newRate.rate}
                    onChange={e => setNewRate(prev => ({ ...prev, rate: e.target.value }))}
                    className="input-field w-32 py-1.5 text-sm"
                    required
                  />
                </div>
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="US Dollar"
                    value={newRate.description}
                    onChange={e => setNewRate(prev => ({ ...prev, description: e.target.value }))}
                    className="input-field py-1.5 text-sm w-full"
                  />
                </div>
                <button type="submit" className="btn-primary py-1.5 text-sm" disabled={addingNewRate}>
                  {addingNewRate ? 'Saving…' : 'Add Rate'}
                </button>
              </form>
            </div>
          )}

          <p className="text-xs text-gray-400">
            Rates are applied when aggregating multi-currency leads on the dashboard. NGN is always 1.00.
          </p>
        </div>
      )}
    </div>
  );
}
