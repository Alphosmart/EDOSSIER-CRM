import { useState, useEffect } from 'react';
import { commissionService } from '../services/commissionService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import { formatNaira } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import toast from 'react-hot-toast';
import {
  HiOutlineCurrencyDollar, HiOutlineClock, HiOutlineCheckCircle,
  HiOutlineCheck, HiOutlineBanknotes
} from 'react-icons/hi2';

export default function CommissionsPage() {
  const { user, hasRole } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('list'); // list | summary

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [commRes, sumRes] = await Promise.all([
        hasRole('manager', 'admin') ? commissionService.getAll() : commissionService.getMy(),
        commissionService.getSummary()
      ]);
      setCommissions(commRes.data);
      setSummary(sumRes.data);
    } catch (error) {
      toast.error('Failed to load commissions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await commissionService.approve(id);
      toast.success('Commission approved');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleDisburse = async (id) => {
    if (!window.confirm('Mark this commission as disbursed (payment sent)?')) return;
    try {
      await commissionService.disburse(id);
      toast.success('Commission marked as disbursed — awaiting marketer confirmation');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to disburse');
    }
  };

  const handleConfirm = async (id) => {
    if (!window.confirm('Confirm that you have received this commission payment?')) return;
    try {
      await commissionService.confirm(id);
      toast.success('Payment receipt confirmed');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm receipt');
    }
  };

  const filtered = filter === 'all' ? commissions : commissions.filter(c => c.status === filter);

  if (loading) return <LoadingSpinner size="lg" />;

  const summaryCards = summary ? [
    { label: 'Total Earned', value: formatNaira(summary.totalAmount || 0), icon: HiOutlineCurrencyDollar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pending', value: formatNaira(summary.pending?.amount || 0), icon: HiOutlineClock, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Approved', value: formatNaira(summary.approved?.amount || 0), icon: HiOutlineCheckCircle, color: 'bg-green-50 text-green-600' },
    { label: 'Disbursed', value: formatNaira(summary.disbursed?.amount || 0), icon: HiOutlineBanknotes, color: 'bg-orange-50 text-orange-600' },
    { label: 'Confirmed Paid', value: formatNaira(summary.paid?.amount || 0), icon: HiOutlineCheck, color: 'bg-purple-50 text-purple-600' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Commissions</h1>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setTab('list')}
            className={`px-3 py-1 text-sm rounded-md ${tab === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >List</button>
          <button
            onClick={() => setTab('summary')}
            className={`px-3 py-1 text-sm rounded-md ${tab === 'summary' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >Summary</button>
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
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-lg font-bold text-gray-900">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {tab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'Pending', 'Approved', 'Disbursed', 'Paid'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-lg ${
                  filter === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All' : f} ({f === 'all' ? commissions.length : commissions.filter(c => c.status === f).length})
              </button>
            ))}
          </div>

          {/* Commission List */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3">School</th>
                    {hasRole('manager', 'admin') && <th className="px-4 py-3">Rep</th>}
                    <th className="px-4 py-3">Deal Value</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500">No commissions found</td></tr>
                  ) : filtered.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{c.leadId?.schoolName || 'N/A'}</td>
                      {hasRole('manager', 'admin') && (
                        <td className="px-4 py-3">{c.userId?.firstName} {c.userId?.lastName}</td>
                      )}
                      <td className="px-4 py-3">{formatNaira(c.dealAmount)}</td>
                      <td className="px-4 py-3">{c.commissionPercentage}%</td>
                      <td className="px-4 py-3 font-bold text-green-600">{formatNaira(c.commissionAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          c.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          c.status === 'Disbursed' ? 'bg-orange-100 text-orange-800' :
                          c.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>{c.status === 'Paid' ? 'Confirmed Paid' : c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                      {hasRole('manager', 'admin') && (
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {c.status === 'Pending' && hasRole('manager', 'admin') && (
                              <button onClick={() => handleApprove(c._id)}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                                Approve
                              </button>
                            )}
                            {c.status === 'Approved' && hasRole('admin') && (
                              <button onClick={() => handleDisburse(c._id)}
                                className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">
                                Mark Disbursed
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                      {/* Marketer confirm receipt */}
                      {!hasRole('manager', 'admin') && (
                        <td className="px-4 py-3">
                          {c.status === 'Disbursed' && c.userId?._id === user?._id && (
                            <button onClick={() => handleConfirm(c._id)}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                              Confirm Received
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'summary' && summary && (
        <div className="space-y-6">
          {/* By Rep Summary (managers/admin) */}
          {summary.byRep && summary.byRep.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Commission by Sales Rep</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                      <th className="px-4 py-3">Rep</th>
                      <th className="px-4 py-3">Deals</th>
                      <th className="px-4 py-3">Total Commission</th>
                      <th className="px-4 py-3">Pending</th>
                      <th className="px-4 py-3">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.byRep.map((rep, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{rep.name}</td>
                        <td className="px-4 py-3">{rep.dealCount}</td>
                        <td className="px-4 py-3 font-bold">{formatNaira(rep.totalCommission)}</td>
                        <td className="px-4 py-3 text-yellow-600">{formatNaira(rep.pending)}</td>
                        <td className="px-4 py-3 text-green-600">{formatNaira(rep.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly Breakdown */}
          {summary.monthly && summary.monthly.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Monthly Commission</h3>
              <div className="space-y-3">
                {summary.monthly.map((month, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-medium">{month.month}</span>
                    <span className="text-lg font-bold text-green-600">{formatNaira(month.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
