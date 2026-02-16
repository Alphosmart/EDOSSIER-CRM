import { useState, useEffect } from 'react';
import { reportService } from '../services/userService';
import { dashboardService } from '../services/dashboardService';
import { formatNaira } from '../utils/formatCurrency';
import LoadingSpinner from '../components/common/LoadingSpinner';
import TerritoryChart from '../components/dashboard/TerritoryChart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const PIE_COLORS = ['#2563eb', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [salesReport, setSalesReport] = useState(null);
  const [commissionReport, setCommissionReport] = useState(null);
  const [territoryReport, setTerritoryReport] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const [salesRes, comRes, terRes, monthlyRes] = await Promise.all([
        reportService.getSales(dateRange.startDate ? dateRange : {}),
        reportService.getCommissions(),
        reportService.getTerritory(),
        dashboardService.getMonthly()
      ]);
      setSalesReport(salesRes.data);
      setCommissionReport(comRes.data);
      setTerritoryReport(terRes.data);
      setMonthly(monthlyRes.data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const { data } = await reportService.exportData({ type });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edossier-${type}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  const tabs = [
    { id: 'sales', label: 'Sales Report' },
    { id: 'commissions', label: 'Commission Report' },
    { id: 'territory', label: 'Territory Report' },
    { id: 'monthly', label: 'Monthly Performance' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Reports</h1>
        <div className="flex gap-2">
          <button onClick={() => handleExport('leads')} className="btn-secondary text-sm">
            Export Leads
          </button>
          <button onClick={() => handleExport('commissions')} className="btn-secondary text-sm">
            Export Commissions
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sales Report */}
      {activeTab === 'sales' && salesReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Leads</p>
              <p className="text-2xl font-bold">{salesReport.totalLeads}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Won</p>
              <p className="text-2xl font-bold text-green-600">{salesReport.closedWon}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Lost</p>
              <p className="text-2xl font-bold text-red-600">{salesReport.closedLost}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Win Rate</p>
              <p className="text-2xl font-bold text-primary-600">{salesReport.winRate}%</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-2xl font-bold">{formatNaira(salesReport.totalRevenue)}</p>
            </div>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500 mb-1">Average Deal Size</p>
            <p className="text-xl font-bold">{formatNaira(salesReport.averageDealSize)}</p>
          </div>
        </div>
      )}

      {/* Commission Report */}
      {activeTab === 'commissions' && commissionReport && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Commission</p>
              <p className="text-xl font-bold">{formatNaira(commissionReport.summary.total)}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{formatNaira(commissionReport.summary.pending)}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-xl font-bold text-green-600">{formatNaira(commissionReport.summary.approved)}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-xl font-bold text-purple-600">{formatNaira(commissionReport.summary.paid)}</p>
            </div>
          </div>

          {commissionReport.commissions.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Commission Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pending', value: commissionReport.summary.pending },
                        { name: 'Approved', value: commissionReport.summary.approved },
                        { name: 'Paid', value: commissionReport.summary.paid }
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatNaira(value)}`}
                    >
                      {[0, 1, 2].map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatNaira(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Territory Report */}
      {activeTab === 'territory' && territoryReport && (
        <div className="space-y-6">
          <TerritoryChart data={territoryReport} />
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-semibold text-gray-500">Territory</th>
                  <th className="pb-3 font-semibold text-gray-500 text-right">Leads</th>
                  <th className="pb-3 font-semibold text-gray-500 text-right">Won</th>
                  <th className="pb-3 font-semibold text-gray-500 text-right">Lost</th>
                  <th className="pb-3 font-semibold text-gray-500 text-right">Win Rate</th>
                  <th className="pb-3 font-semibold text-gray-500 text-right">Revenue</th>
                  <th className="pb-3 font-semibold text-gray-500 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {territoryReport.map(t => (
                  <tr key={t.territory} className="hover:bg-gray-50">
                    <td className="py-3 font-medium">{t.territory}</td>
                    <td className="py-3 text-right">{t.totalLeads}</td>
                    <td className="py-3 text-right text-green-600">{t.closedWon}</td>
                    <td className="py-3 text-right text-red-600">{t.closedLost}</td>
                    <td className="py-3 text-right">{t.winRate}%</td>
                    <td className="py-3 text-right font-medium">{formatNaira(t.revenue)}</td>
                    <td className="py-3 text-right">{formatNaira(t.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly Performance */}
      {activeTab === 'monthly' && monthly && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-sm text-gray-500">New Leads This Month</p>
            <p className="text-2xl font-bold">{monthly.newLeadsThisMonth}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Closed Won</p>
            <p className="text-2xl font-bold text-green-600">{monthly.closedWonThisMonth}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Revenue This Month</p>
            <p className="text-2xl font-bold">{formatNaira(monthly.revenueThisMonth)}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">Commission This Month</p>
            <p className="text-2xl font-bold text-green-600">{formatNaira(monthly.commissionThisMonth)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
