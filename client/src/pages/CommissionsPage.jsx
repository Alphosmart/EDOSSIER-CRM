import { useState, useEffect } from 'react';
import { commissionService } from '../services/commissionService';
import { getCachedRateMap } from '../services/exchangeRateService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import toast from 'react-hot-toast';
import {
  HiOutlineCurrencyDollar, HiOutlineClock, HiOutlineCheckCircle,
  HiOutlineCheck, HiOutlineBanknotes, HiOutlineXMark
} from 'react-icons/hi2';

// ── Status badge ──────────────────────────────────────────────────────────────
function CommissionBadge({ status }) {
  const styles = {
    Pending:   'bg-yellow-100 text-yellow-800',
    Approved:  'bg-blue-100 text-blue-800',
    Disbursed: 'bg-orange-100 text-orange-800',
    Paid:      'bg-green-100 text-green-800',
  };
  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status === 'Paid' ? 'Confirmed Paid' : status}
    </span>
  );
}

// ── Disburse modal ────────────────────────────────────────────────────────────
function DisburseModal({ commission, rateMap, onClose, onConfirm }) {
  const [ref, setRef] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onConfirm(commission._id, ref);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Mark Commission as Disbursed</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <p><span className="text-gray-500">School:</span> <span className="font-medium">{commission.leadId?.schoolName}</span></p>
            <p><span className="text-gray-500">Rep:</span> <span className="font-medium">{commission.userId?.firstName} {commission.userId?.lastName}</span></p>
            <p><span className="text-gray-500">USD:</span> <span className="font-bold text-green-700">{formatCurrency(commission.commissionAmount, 'USD')}</span></p>
            {rateMap && <p><span className="text-gray-500">NGN:</span> <span className="font-bold text-blue-700">{formatCurrency(commission.commissionAmount * (rateMap['USD'] || 1650), 'NGN')}</span></p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Reference <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={ref}
              onChange={e => setRef(e.target.value)}
              className="input-field"
              placeholder="e.g., bank transfer ref, receipt number…"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : 'Confirm Disbursed'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CommissionsPage() {
  const { user, hasRole } = useAuth();
  const isManagerOrAdmin = hasRole('manager', 'admin');
  const isAdmin = hasRole('admin');

  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('list');
  const [disburseTarget, setDisburseTarget] = useState(null);
  const [rateMap, setRateMap] = useState({ NGN: 1, USD: 1650 });

  // Default: sales reps see NGN (their payout currency), managers/admins see USD.
  // Persisted per user in localStorage so manual overrides survive page refresh.
  const storageKey = user ? `commissionCurrency_${user._id}` : 'commissionCurrency';
  const defaultCurrency = isManagerOrAdmin ? 'USD' : 'NGN';
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem(storageKey) || defaultCurrency
  );

  const toggleCurrency = (c) => {
    setDisplayCurrency(c);
    localStorage.setItem(storageKey, c);
  };

  useEffect(() => {
    loadData();
    getCachedRateMap().then(setRateMap);
  }, []);

  // Convert a USD amount to the selected display currency
  const fmt = (usdAmount) => {
    if (displayCurrency === 'NGN') {
      return formatCurrency(usdAmount * (rateMap['USD'] || 1650), 'NGN');
    }
    return formatCurrency(usdAmount, 'USD');
  };

  const loadData = async () => {
    try {
      const [commRes, sumRes] = await Promise.all([
        isManagerOrAdmin ? commissionService.getAll() : commissionService.getMy(),
        commissionService.getSummary()
      ]);
      setCommissions(commRes.data);
      setSummary(sumRes.data);
    } catch {
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this commission?')) return;
    try {
      await commissionService.approve(id);
      toast.success('Commission approved ✓');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleDisburse = async (id, paymentReference) => {
    try {
      await commissionService.disburse(id, { paymentReference });
      toast.success('Marked as disbursed — rep will confirm receipt');
      setDisburseTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disburse');
    }
  };

  const handleConfirmReceipt = async (id) => {
    if (!window.confirm('Confirm that you personally received this commission payment?')) return;
    try {
      await commissionService.confirm(id);
      toast.success('Payment receipt confirmed ✓');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm receipt');
    }
  };

  const filtered = filter === 'all' ? commissions : commissions.filter(c => c.status === filter);
  const FILTERS = ['all', 'Pending', 'Approved', 'Disbursed', 'Paid'];

  const downloadCSV = () => {
    const headers = ['School', 'Sales Rep', 'Deal Value (USD)', 'Rate (%)', 'Commission (USD)', 'Status', 'Date'];
    const rows = filtered.map(c => [
      `"${c.leadId?.schoolName || ''}"`,
      `"${c.userId?.firstName || ''} ${c.userId?.lastName || ''}"`,
      c.dealAmount || 0,
      c.commissionPercentage || 0,
      c.commissionAmount || 0,
      c.status || '',
      c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commissions_${filter}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const summaryCards = summary ? [
    { label: 'Total Earned',   value: fmt(summary.totalAmount || 0),         icon: HiOutlineCurrencyDollar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending',        value: fmt(summary.pending?.amount || 0),      icon: HiOutlineClock,          color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Approved',       value: fmt(summary.approved?.amount || 0),     icon: HiOutlineCheckCircle,    color: 'bg-sky-50 text-sky-600' },
    { label: 'Disbursed',      value: fmt(summary.disbursed?.amount || 0),    icon: HiOutlineBanknotes,      color: 'bg-orange-50 text-orange-600' },
    { label: 'Confirmed Paid', value: fmt(summary.paid?.amount || 0),         icon: HiOutlineCheck,          color: 'bg-green-50 text-green-600' },
  ] : [];

  // ── Workflow steps banner ────────────────────────────────────────────────────
  const steps = [
    { key: 'Pending',   label: 'Pending',   by: 'Auto-created' },
    { key: 'Approved',  label: 'Approved',  by: 'Manager / Admin' },
    { key: 'Disbursed', label: 'Disbursed', by: 'Admin' },
    { key: 'Paid',      label: 'Confirmed', by: 'Sales Rep' },
  ];
  const stepColors = {
    Pending: 'bg-yellow-100 text-yellow-800',
    Approved: 'bg-sky-100 text-sky-800',
    Disbursed: 'bg-orange-100 text-orange-800',
    Paid: 'bg-green-100 text-green-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Commissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track approval, disbursement and receipt of commission payments</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Currency toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
            <button
              onClick={() => toggleCurrency('USD')}
              className={`px-3 py-1 text-sm rounded-md font-medium transition-all ${
                displayCurrency === 'USD' ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}>
              $ USD
            </button>
            <button
              onClick={() => toggleCurrency('NGN')}
              className={`px-3 py-1 text-sm rounded-md font-medium transition-all ${
                displayCurrency === 'NGN' ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:text-gray-700'
              }`}>
              ₦ NGN
            </button>
          </div>
          {/* List / Summary tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setTab('list')}
              className={`px-3 py-1 text-sm rounded-md ${tab === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              List
            </button>
            <button onClick={() => setTab('summary')}
              className={`px-3 py-1 text-sm rounded-md ${tab === 'summary' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              Summary
            </button>
          </div>
          {/* CSV Export */}
          <button onClick={downloadCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Workflow Steps Banner */}
      <div className="card py-3">
        <div className="flex items-center justify-between gap-1">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <div className="flex-1 text-center">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${stepColors[step.key]}`}>
                  {step.label}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{step.by}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="text-gray-300 text-xl font-light self-start mt-1">›</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="card flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-base font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {tab === 'list' && (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {f === 'all' ? 'All' : f} ({f === 'all' ? commissions.length : commissions.filter(c => c.status === f).length})
              </button>
            ))}
          </div>

          {/* Commission Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3">School</th>
                    {isManagerOrAdmin && <th className="px-4 py-3">Rep</th>}
                    <th className="px-4 py-3 text-right">Deal Value</th>
                    <th className="px-4 py-3 text-center">Rate</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Audit Trail</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isManagerOrAdmin ? 8 : 7} className="px-4 py-10 text-center text-gray-400">
                        No commissions found
                      </td>
                    </tr>
                  ) : filtered.map(c => {
                    const isOwner = c.userId?._id === user?._id || c.userId === user?._id;
                    return (
                      <tr key={c._id} className="hover:bg-gray-50 align-top">
                        <td className="px-4 py-3 font-medium">
                          {c.leadId?.schoolName || 'N/A'}
                          {c.leadId?.schoolId && <p className="text-xs text-gray-400">{c.leadId.schoolId}</p>}
                        </td>
                        {isManagerOrAdmin && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            {c.userId?.firstName} {c.userId?.lastName}
                            {c.userId?.territory && <p className="text-xs text-gray-400">{c.userId.territory}</p>}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">{fmt(c.dealAmount)}</td>
                        <td className="px-4 py-3 text-center">{c.commissionPercentage}%</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">{fmt(c.commissionAmount)}</td>
                        <td className="px-4 py-3"><CommissionBadge status={c.status} /></td>

                        {/* Audit trail */}
                        <td className="px-4 py-3 text-xs text-gray-500 space-y-0.5 min-w-[180px]">
                          <p className="text-gray-400">{formatDate(c.createdAt)}</p>
                          {c.approvedBy && (
                            <p>
                              <span className="text-sky-600 font-medium">Approved</span>{' '}
                              by {c.approvedBy.firstName} {c.approvedBy.lastName}
                              {c.approvedDate && <span className="ml-1 text-gray-400">· {formatDate(c.approvedDate)}</span>}
                            </p>
                          )}
                          {c.disbursedBy && (
                            <p>
                              <span className="text-orange-600 font-medium">Disbursed</span>{' '}
                              by {c.disbursedBy.firstName} {c.disbursedBy.lastName}
                              {c.disbursedDate && <span className="ml-1 text-gray-400">· {formatDate(c.disbursedDate)}</span>}
                            </p>
                          )}
                          {c.paymentReference && (
                            <p className="font-mono text-gray-600">Ref: {c.paymentReference}</p>
                          )}
                          {c.confirmedBy && (
                            <p>
                              <span className="text-green-600 font-medium">Receipt confirmed</span>
                              {c.confirmedDate && <span className="ml-1 text-gray-400">· {formatDate(c.confirmedDate)}</span>}
                            </p>
                          )}
                        </td>

                        {/* Actions — single <td> always rendered */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {/* Manager or Admin: Approve when Pending */}
                            {isManagerOrAdmin && c.status === 'Pending' && (
                              <button onClick={() => handleApprove(c._id)}
                                className="px-2 py-1 text-xs bg-sky-600 text-white rounded hover:bg-sky-700 whitespace-nowrap">
                                ✓ Approve
                              </button>
                            )}
                            {/* Admin: Disburse when Approved */}
                            {isAdmin && c.status === 'Approved' && (
                              <button onClick={() => setDisburseTarget(c)}
                                className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 whitespace-nowrap">
                                💸 Mark Disbursed
                              </button>
                            )}
                            {/* Rep: Receipt dropdown — shown when Disbursed (owner) or already Paid */}
                            {!isManagerOrAdmin && isOwner && (c.status === 'Disbursed' || c.status === 'Paid') && (
                              <select
                                value={c.status === 'Paid' ? 'received' : 'not_received'}
                                disabled={c.status === 'Paid'}
                                onChange={e => {
                                  if (e.target.value === 'received') handleConfirmReceipt(c._id);
                                }}
                                className={`px-2 py-1 text-xs rounded border ${
                                  c.status === 'Paid'
                                    ? 'bg-green-50 text-green-700 border-green-300 cursor-default'
                                    : 'bg-white text-gray-700 border-gray-300 cursor-pointer hover:border-green-400'
                                }`}
                              >
                                <option value="not_received">⏳ Not Received Yet</option>
                                <option value="received">✓ Received</option>
                              </select>
                            )}
                            {/* Admin can also force-confirm receipt if needed */}
                            {isAdmin && c.status === 'Disbursed' && (
                              <button onClick={() => handleConfirmReceipt(c._id)}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap">
                                ✓ Confirm Receipt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'summary' && summary && (
        <div className="space-y-6">
          {/* By Rep (managers/admin) */}
          {summary.byRep && summary.byRep.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Commission by Sales Rep</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                      <th className="px-4 py-3">Rep</th>
                      <th className="px-4 py-3 text-right">Deals</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Pending</th>
                      <th className="px-4 py-3 text-right">Approved</th>
                      <th className="px-4 py-3 text-right">Disbursed</th>
                      <th className="px-4 py-3 text-right">Confirmed Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.byRep.map((rep, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{rep.name}</td>
                        <td className="px-4 py-3 text-right">{rep.dealCount}</td>
                        <td className="px-4 py-3 text-right font-bold">{fmt(rep.totalCommission)}</td>
                        <td className="px-4 py-3 text-right text-yellow-600">{fmt(rep.pending || 0)}</td>
                        <td className="px-4 py-3 text-right text-sky-600">{fmt(rep.approved || 0)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{fmt(rep.disbursed || 0)}</td>
                        <td className="px-4 py-3 text-right text-green-600">{fmt(rep.paid || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly */}
          {summary.monthly && summary.monthly.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Monthly Commission</h3>
              <div className="space-y-3">
                {summary.monthly.map((month, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-lg font-bold text-green-600">{fmt(month.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disburse Modal */}
      {disburseTarget && (
        <DisburseModal
          commission={disburseTarget}
          rateMap={rateMap}
          onClose={() => setDisburseTarget(null)}
          onConfirm={handleDisburse}
        />
      )}
    </div>
  );
}
