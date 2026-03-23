import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { formatCurrency } from '../utils/formatCurrency';
import { getCachedRateMap } from '../services/exchangeRateService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  HiOutlineTrendingUp, HiOutlineCurrencyDollar, HiOutlineCalendar,
  HiOutlineRefresh, HiOutlineChartBar, HiOutlineOfficeBuilding
} from 'react-icons/hi';

// Matches actual EDOSSIER CRM pipeline statuses
const STAGE_COLORS = {
  'Interested':     '#60a5fa',
  'Needs Proposal': '#facc15',
  'Needs Approval': '#fb923c',
  'Demo Scheduled': '#c084fc',
  'Proposal Sent':  '#818cf8',
  'Negotiation':    '#f472b6',
  'Closed Won':     '#22c55e',
  'Closed Lost':    '#ef4444',
  'Not Interested': '#94a3b8',
};

export default function ForecastPage() {
  const { user, hasRole } = useAuth();
  const isAdminOrManager = hasRole('admin', 'manager', 'bursar');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rateMap, setRateMap] = useState({ NGN: 1, USD: 1650 });

  // Currency toggle (persisted)
  const currencyKey = user ? `forecastCurrency_${user._id}` : 'forecastCurrency';
  const defaultCurrency = isAdminOrManager ? 'USD' : 'NGN';
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem(currencyKey) || defaultCurrency
  );
  const toggleCurrency = (c) => { setDisplayCurrency(c); localStorage.setItem(currencyKey, c); };
  const fmt = (usdAmt) => displayCurrency === 'NGN'
    ? formatCurrency((usdAmt || 0) * (rateMap['USD'] || 1650), 'NGN')
    : formatCurrency(usdAmt || 0, 'USD');

  useEffect(() => { loadData(); getCachedRateMap().then(setRateMap); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: res } = await dashboardService.getForecast();
      setData(res);
    } catch {
      toast.error('Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!data) return <div className="text-center py-12 text-gray-500">No data available</div>;

  // API field mapping (server returns different names than the original placeholder used)
  const weightedPipeline   = data.weightedForecast                     || 0;
  const totalPipelineValue = data.totalNegotiatedRevenue                || 0;
  const expectedThisMonth  = data.expectedClosingsThisMonth?.value      || 0;
  const expectedNextMonth  = data.expectedClosingsNextMonth?.value      || 0;
  const thisMonthCount     = data.expectedClosingsThisMonth?.count      || 0;
  const nextMonthCount     = data.expectedClosingsNextMonth?.count      || 0;

  const kpis = [
    {
      label: 'Weighted Pipeline',
      value: fmt(weightedPipeline),
      sub: `${data.totalActivePipeline || 0} active deals`,
      icon: HiOutlineChartBar,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Total Pipeline Value',
      value: fmt(totalPipelineValue),
      sub: 'Negotiated prices',
      icon: HiOutlineCurrencyDollar,
      color: 'bg-green-50 text-green-600'
    },
    {
      label: 'Expected This Month',
      value: fmt(expectedThisMonth),
      sub: `${thisMonthCount} deal${thisMonthCount !== 1 ? 's' : ''} closing`,
      icon: HiOutlineCalendar,
      color: 'bg-purple-50 text-purple-600'
    },
    {
      label: 'Expected Next Month',
      value: fmt(expectedNextMonth),
      sub: `${nextMonthCount} deal${nextMonthCount !== 1 ? 's' : ''} in pipeline`,
      icon: HiOutlineTrendingUp,
      color: 'bg-indigo-50 text-indigo-600'
    },
  ];

  // byStage from API uses 'status' key (not 'stage')
  const stageBarData = (data.byStage || []).filter(s => s.totalValue > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Revenue Forecast</h1>
          <p className="text-sm text-gray-500 mt-1">Pipeline outlook &amp; weighted deal value</p>
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
          <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-1">
            <HiOutlineRefresh className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="card flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage — Horizontal Bar */}
        {stageBarData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Pipeline by Stage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageBarData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => displayCurrency === 'NGN'
                    ? (v >= 1_000_000_000 ? `₦${(v / 1_000_000_000).toFixed(1)}B` : v >= 1_000_000 ? `₦${(v / 1_000_000).toFixed(1)}M` : `₦${(v / 1_000).toFixed(0)}K`)
                    : (v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${(v / 1_000).toFixed(0)}K`)
                  }
                  tick={{ fontSize: 11 }}
                />
                <YAxis type="category" dataKey="status" width={115} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v, name) => [
                    fmt(v),
                    name === 'weightedValue' ? 'Weighted Value' : 'Total Value'
                  ]}
                />
                <Legend formatter={(v) => v === 'weightedValue' ? 'Weighted Value' : 'Total Value'} />
                <Bar dataKey="totalValue"    fill="#93c5fd" name="totalValue"    radius={[0, 4, 4, 0]} />
                <Bar dataKey="weightedValue" fill="#2563eb" name="weightedValue" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stage Breakdown Table */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Stage Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3 text-right">Deals</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                  <th className="px-4 py-3 text-right">Prob%</th>
                  <th className="px-4 py-3 text-right">Weighted</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data.byStage || []).map((s, i) => {
                  // Probability derived from weighted/total ratio
                  const prob = s.totalValue > 0
                    ? Math.round((s.weightedValue / s.totalValue) * 100)
                    : 0;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: STAGE_COLORS[s.status] || '#94a3b8' }}
                          />
                          <span className="font-medium">{s.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{s.count}</td>
                      <td className="px-4 py-3 text-right">{fmt(s.totalValue)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{prob}%</td>
                      <td className="px-4 py-3 text-right font-bold text-primary-600">{fmt(s.weightedValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold text-sm">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">
                    {(data.byStage || []).reduce((s, r) => s + r.count, 0)}
                  </td>
                  <td className="px-4 py-3 text-right">{fmt(totalPipelineValue)}</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right text-primary-600">{fmt(weightedPipeline)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Top Prospects */}
      {data.topProspects && data.topProspects.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HiOutlineTrendingUp className="w-5 h-5 text-green-500" />
            Top Prospects
            <span className="text-sm font-normal text-gray-500 ml-1">by weighted value</span>
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3">Assigned To</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">Prob%</th>
                  <th className="px-4 py-3 text-right">Weighted</th>
                  <th className="px-4 py-3">Expected Close</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.topProspects.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/leads/${p._id}`} className="font-medium text-primary-600 hover:underline">
                        {p.schoolName}
                      </Link>
                      <p className="text-xs text-gray-500">{p.schoolId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.currentStatus} size="xs" />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.territory || '—'}</td>
                    <td className="px-4 py-3">
                      {p.assignedTo
                        ? `${p.assignedTo.firstName} ${p.assignedTo.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {fmt(p.negotiatedPrice || 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {p.probabilityOfClosing || 0}%
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary-600">
                      {fmt(p.weightedValue)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.expectedClosingDate
                        ? new Date(p.expectedClosingDate).toLocaleDateString('en-NG', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Closed Revenue Banner */}
      {data.totalClosedRevenue > 0 && (
        <div className="card bg-green-50 border border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg">
              <HiOutlineOfficeBuilding className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-700 uppercase tracking-wide font-medium">
                Closed Revenue (period)
              </p>
              <p className="text-2xl font-bold text-green-800">
                {fmt(data.totalClosedRevenue)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
