import { useState, useEffect } from 'react';
import { reportService } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/formatCurrency';
import { getCachedRateMap } from '../services/exchangeRateService';
import { TERRITORIES } from '../utils/constants';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { HiOutlineDocumentDownload } from 'react-icons/hi';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function ReportsPage() {
  const { user, hasRole } = useAuth();
  const isAdminOrManager = hasRole('admin', 'manager');
  const [activeTab, setActiveTab] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [salesReport, setSalesReport] = useState(null);
  const [commissionReport, setCommissionReport] = useState(null);
  const [territoryReport, setTerritoryReport] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Currency toggle (persisted) — report data is stored in NGN
  const currencyKey = user ? `reportsCurrency_${user._id}` : 'reportsCurrency';
  const defaultCurrency = isAdminOrManager ? 'USD' : 'NGN';
  const [rateMap, setRateMap] = useState({ NGN: 1, USD: 1650 });
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem(currencyKey) || defaultCurrency
  );
  const toggleCurrency = (c) => { setDisplayCurrency(c); localStorage.setItem(currencyKey, c); };
  // API values are in NGN; divide by USD rate to show USD
  const fmt = (ngnAmt) => displayCurrency === 'NGN'
    ? formatCurrency(ngnAmt || 0, 'NGN')
    : formatCurrency((ngnAmt || 0) / (rateMap['USD'] || 1650), 'USD');
  const yAxisFmt = (v) => displayCurrency === 'NGN'
    ? (v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M` : `₦${(v / 1_000).toFixed(0)}K`)
    : (v >= 1_000 ? `$${((v / (rateMap['USD'] || 1650)) / 1_000).toFixed(0)}K` : `$${(v / (rateMap['USD'] || 1650)).toFixed(0)}`);

  useEffect(() => {
    getCachedRateMap().then(setRateMap);
  }, []);

  useEffect(() => {
    loadReport();
  }, [activeTab, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = { ...dateRange };
      if (activeTab === 'sales') {
        const { data } = await reportService.getSalesReport(params);
        setSalesReport(data);
      } else if (activeTab === 'commission') {
        const { data } = await reportService.getCommissionReport(params);
        setCommissionReport(data);
      } else if (activeTab === 'territory') {
        const { data } = await reportService.getTerritoryReport(params);
        setTerritoryReport(data);
      }
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = { type: activeTab, ...dateRange };
      const { data } = await reportService.exportData(params);
      // Create downloadable CSV
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab}-report-${dateRange.startDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const tabs = [
    { id: 'sales', label: 'Sales Report' },
    { id: 'commission', label: 'Commission Report' },
    ...(hasRole('manager', 'admin') ? [{ id: 'territory', label: 'Territory Report' }] : [])
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">Reports</h1>
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
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <HiOutlineDocumentDownload className="w-5 h-5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              activeTab === t.id
                ? 'bg-white border border-b-white text-primary-600 -mb-[3px]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Date Range */}
      <div className="card">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="input-field"
            />
          </div>
          <button onClick={loadReport} className="btn-primary">Apply</button>
        </div>
      </div>

      {loading && <LoadingSpinner size="lg" />}

      {/* Sales Report */}
      {!loading && activeTab === 'sales' && salesReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Leads</p>
              <p className="text-2xl font-bold">{salesReport.totalLeads || 0}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Won</p>
              <p className="text-2xl font-bold text-green-600">{salesReport.wonDeals || 0}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-2xl font-bold text-primary-600">{fmt(salesReport.totalRevenue || 0)}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold">{salesReport.winRate || 0}%</p>
            </div>
          </div>

          {/* Rep performance */}
          {salesReport.byRep && salesReport.byRep.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Performance by Rep</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesReport.byRep}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={yAxisFmt} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#2563eb" name="Revenue" />
                  <Bar dataKey="pipeline" fill="#f59e0b" name="Pipeline" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Status Distribution */}
          {salesReport.byStatus && salesReport.byStatus.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Lead Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={salesReport.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {salesReport.byStatus.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Commission Report */}
      {!loading && activeTab === 'commission' && commissionReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Commission</p>
              <p className="text-2xl font-bold text-green-600">{fmt(commissionReport.totalCommission || 0)}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-600">{fmt(commissionReport.pending || 0)}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Paid Out</p>
              <p className="text-2xl font-bold text-primary-600">{fmt(commissionReport.paid || 0)}</p>
            </div>
          </div>

          {commissionReport.details && commissionReport.details.length > 0 && (
            <div className="card overflow-hidden">
              <h3 className="text-lg font-semibold mb-4">Commission Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                      <th className="px-4 py-3">School</th>
                      <th className="px-4 py-3">Deal Value</th>
                      <th className="px-4 py-3">Rate</th>
                      <th className="px-4 py-3">Commission</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {commissionReport.details.map((d, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{d.schoolName}</td>
                        <td className="px-4 py-3">{fmt(d.dealValue)}</td>
                        <td className="px-4 py-3">{d.rate}%</td>
                        <td className="px-4 py-3 font-bold text-green-600">{fmt(d.commission)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            d.status === 'Paid' ? 'bg-green-100 text-green-800' :
                            d.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>{d.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Territory Report */}
      {!loading && activeTab === 'territory' && territoryReport && (
        <div className="space-y-6">
          {territoryReport.territories && territoryReport.territories.length > 0 && (
            <>
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Territory Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={territoryReport.territories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="territory" />
                    <YAxis tickFormatter={yAxisFmt} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#16a34a" name="Revenue" />
                    <Bar dataKey="pipeline" fill="#2563eb" name="Pipeline" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {territoryReport.territories.map((t, i) => (
                  <div key={i} className="card">
                    <h4 className="font-semibold text-lg mb-3">{t.territory}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Revenue:</span>
                        <span className="ml-2 font-bold text-green-600">{fmt(t.revenue || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Pipeline:</span>
                        <span className="ml-2 font-bold text-primary-600">{fmt(t.pipeline || 0)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Leads:</span>
                        <span className="ml-2 font-medium">{t.leadCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Win Rate:</span>
                        <span className="ml-2 font-medium">{t.winRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
