import { useState, useEffect } from 'react';
import { commissionService } from '../services/commissionService';
import { useAuth } from '../context/AuthContext';
import { formatNaira } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import {
  HiOutlineCurrencyDollar, HiOutlineCheck, HiOutlineCash,
  HiOutlineClock
} from 'react-icons/hi';

export default function CommissionsPage() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [payModal, setPayModal] = useState({ open: false, commission: null });
  const [paymentRef, setPaymentRef] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      const [comRes, sumRes] = await Promise.all([
        commissionService.getAll({ status: statusFilter || undefined }),
        commissionService.getSummary()
      ]);
      setCommissions(comRes.data);
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

  const handlePay = async () => {
    try {
      await commissionService.pay(payModal.commission._id, { paymentReference: paymentRef });
      toast.success('Commission marked as paid');
      setPayModal({ open: false, commission: null });
      setPaymentRef('');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process payment');
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <h1 className="page-title">Commissions</h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><HiOutlineCurrencyDollar className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-lg font-bold">{formatNaira(summary.totalAmount)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg"><HiOutlineClock className="w-5 h-5 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Pending ({summary.pending.count})</p>
                <p className="text-lg font-bold">{formatNaira(summary.pending.amount)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg"><HiOutlineCheck className="w-5 h-5 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Approved ({summary.approved.count})</p>
                <p className="text-lg font-bold">{formatNaira(summary.approved.amount)}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg"><HiOutlineCash className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-500">Paid ({summary.paid.count})</p>
                <p className="text-lg font-bold">{formatNaira(summary.paid.amount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'Pending', 'Approved', 'Paid'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {/* Commission Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 font-semibold text-gray-500">Sales Rep</th>
              <th className="pb-3 font-semibold text-gray-500">School</th>
              <th className="pb-3 font-semibold text-gray-500 text-right">Deal Amount</th>
              <th className="pb-3 font-semibold text-gray-500 text-center">Rate</th>
              <th className="pb-3 font-semibold text-gray-500 text-right">Commission</th>
              <th className="pb-3 font-semibold text-gray-500 text-center">Status</th>
              <th className="pb-3 font-semibold text-gray-500">Date</th>
              {['manager', 'admin'].includes(user?.role) && (
                <th className="pb-3 font-semibold text-gray-500">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {commissions.map(com => (
              <tr key={com._id} className="hover:bg-gray-50">
                <td className="py-3">
                  {com.userId?.firstName} {com.userId?.lastName}
                </td>
                <td className="py-3">
                  <span className="font-medium">{com.leadId?.schoolName}</span>
                  <br />
                  <span className="text-xs text-gray-400">{com.leadId?.schoolId}</span>
                </td>
                <td className="py-3 text-right font-medium">{formatNaira(com.dealAmount)}</td>
                <td className="py-3 text-center">{com.commissionPercentage}%</td>
                <td className="py-3 text-right font-semibold text-green-600">
                  {formatNaira(com.commissionAmount)}
                </td>
                <td className="py-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    com.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                    com.status === 'Approved' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {com.status}
                  </span>
                </td>
                <td className="py-3 text-xs text-gray-500">{formatDate(com.createdAt)}</td>
                {['manager', 'admin'].includes(user?.role) && (
                  <td className="py-3">
                    <div className="flex gap-1">
                      {com.status === 'Pending' && (
                        <button
                          onClick={() => handleApprove(com._id)}
                          className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100"
                        >
                          Approve
                        </button>
                      )}
                      {com.status === 'Approved' && user?.role === 'admin' && (
                        <button
                          onClick={() => setPayModal({ open: true, commission: com })}
                          className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded hover:bg-purple-100"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {commissions.length === 0 && (
              <tr>
                <td colSpan="8" className="py-8 text-center text-gray-500">
                  No commissions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pay Modal */}
      <Modal isOpen={payModal.open} onClose={() => setPayModal({ open: false, commission: null })} title="Mark Commission as Paid">
        {payModal.commission && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p><strong>Rep:</strong> {payModal.commission.userId?.firstName} {payModal.commission.userId?.lastName}</p>
              <p><strong>Amount:</strong> {formatNaira(payModal.commission.commissionAmount)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
              <input
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                className="input-field"
                placeholder="e.g., Transfer ref or receipt number"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handlePay} className="btn-success">Confirm Payment</button>
              <button onClick={() => setPayModal({ open: false, commission: null })} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
