import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { formatNaira } from '../utils/formatCurrency';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Area
} from 'recharts';
import {
  HiOutlineTrendingUp, HiOutlineCurrencyDollar, HiOutlineRefresh,
  HiOutlineChartBar, HiOutlineClipboardList
} from 'react-icons/hi';

export default function MonthlyPerformancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: res } = await dashboardService.getMonthlyPerformance();
      setData(res);
    } catch (error) {
      toast.error('Failed to load monthly performance data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!data) return <div className="text-center py-12 text-gray-500">No data available</div>;

  const months = data.months || [];

  // Calculate totals
  const totals = months.reduce(
    (acc, m) => ({
      leadsCreated: acc.leadsCreated + (m.leadsCreated || 0),
      dealsClosed: acc.dealsClosed + (m.dealsClosed || 0),
      revenue: acc.revenue + (m.revenue || 0),
      commission: acc.commission + (m.commission || 0),
    }),
    { leadsCreated: 0, dealsClosed: 0, revenue: 0, commission: 0 }
  );

  const avgDealSize = totals.dealsClosed > 0 ? totals.revenue / totals.dealsClosed : 0;
  const conversionRate = totals.leadsCreated > 0 ? ((totals.dealsClosed / totals.leadsCreated) * 100).toFixed(1) : 0;

  const kpis = [
    { label: 'Total Revenue (12M)', value: formatNaira(totals.revenue), icon: HiOutlineCurrencyDollar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Deals Closed', value: totals.dealsClosed, icon: HiOutlineChartBar, color: 'bg-green-50 text-green-600' },
    { label: 'Total Leads Created', value: totals.leadsCreated, icon: HiOutlineClipboardList, color: 'bg-purple-50 text-purple-600' },
    { label: 'Avg Deal Size', value: formatNaira(avgDealSize), icon: HiOutlineTrendingUp, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Commission Earned', value: formatNaira(totals.commission), icon: HiOutlineCurrencyDollar, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: HiOutlineTrendingUp, color: 'bg-teal-50 text-teal-600' },
  ];

  // Format month labels for chart
  const chartData = months.map(m => ({
    ...m,
    month: m.monthLabel || m.month,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Monthly Performance</h1>
        <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-1">
          <HiOutlineRefresh className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="card flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-lg font-bold text-gray-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue & Deals Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Revenue & Deals Closed (12 Months)</h3>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tickFormatter={(v) => `₦${(v / 1000000).toFixed(1)}M`} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                formatter={(v, name) => {
                  if (name === 'Revenue' || name === 'Commission') return formatNaira(v);
                  return v;
                }}
              />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="revenue" fill="#dbeafe" stroke="#2563eb" name="Revenue" />
              <Bar yAxisId="right" dataKey="dealsClosed" fill="#16a34a" name="Deals Closed" radius={[4, 4, 0, 0]} barSize={20} />
              <Line yAxisId="right" dataKey="leadsCreated" stroke="#f59e0b" name="Leads Created" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Commission Trend */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Commission Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => formatNaira(v)} />
              <Line type="monotone" dataKey="commission" stroke="#8b5cf6" name="Commission" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Breakdown Table */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Monthly Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                <th className="px-4 py-3">Month</th>
                <th className="px-4 py-3 text-right">Leads Created</th>
                <th className="px-4 py-3 text-right">Deals Closed</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Commission</th>
                <th className="px-4 py-3 text-right">Avg Deal Size</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {months.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.monthLabel || m.month}</td>
                  <td className="px-4 py-3 text-right">{m.leadsCreated || 0}</td>
                  <td className="px-4 py-3 text-right font-bold">{m.dealsClosed || 0}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">{formatNaira(m.revenue || 0)}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{formatNaira(m.commission || 0)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{formatNaira(m.avgDealSize || 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-bold">
                <td className="px-4 py-3">TOTAL</td>
                <td className="px-4 py-3 text-right">{totals.leadsCreated}</td>
                <td className="px-4 py-3 text-right">{totals.dealsClosed}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatNaira(totals.revenue)}</td>
                <td className="px-4 py-3 text-right text-purple-600">{formatNaira(totals.commission)}</td>
                <td className="px-4 py-3 text-right text-gray-600">{formatNaira(avgDealSize)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
