import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { formatNaira } from '../utils/formatCurrency';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  FunnelChart, Funnel, LabelList
} from 'recharts';
import {
  HiOutlineTrendingUp, HiOutlineCurrencyDollar, HiOutlineCalendar,
  HiOutlineRefresh, HiOutlineChartBar
} from 'react-icons/hi';

const STAGE_COLORS = {
  'New Lead': '#94a3b8',
  'Contacted': '#60a5fa',
  'Needs Analysis': '#a78bfa',
  'Proposal Sent': '#fbbf24',
  'Negotiation': '#f97316',
  'Closed Won': '#22c55e',
  'Closed Lost': '#ef4444'
};

export default function ForecastPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: res } = await dashboardService.getForecast();
      setData(res);
    } catch (error) {
      toast.error('Failed to load forecast data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!data) return <div className="text-center py-12 text-gray-500">No data available</div>;

  const kpis = [
    { label: 'Weighted Pipeline', value: formatNaira(data.weightedPipeline), icon: HiOutlineChartBar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Pipeline Value', value: formatNaira(data.totalPipelineValue), icon: HiOutlineCurrencyDollar, color: 'bg-green-50 text-green-600' },
    { label: 'Expected This Month', value: formatNaira(data.expectedThisMonth), icon: HiOutlineCalendar, color: 'bg-purple-50 text-purple-600' },
    { label: 'Expected Next Month', value: formatNaira(data.expectedNextMonth), icon: HiOutlineTrendingUp, color: 'bg-indigo-50 text-indigo-600' },
  ];

  const stageBarData = (data.byStage || []).map(s => ({
    ...s,
    fill: STAGE_COLORS[s.stage] || '#94a3b8'
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Revenue Forecast</h1>
        <button onClick={loadData} className="btn-secondary text-sm flex items-center gap-1">
          <HiOutlineRefresh className="w-4 h-4" />
          Refresh
        </button>
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
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline by Stage */}
        {stageBarData.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Pipeline by Stage</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stageBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `₦${(v / 1000000).toFixed(1)}M`} />
                <YAxis type="category" dataKey="stage" width={120} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, name) => [formatNaira(v), name === 'weighted' ? 'Weighted Value' : 'Total Value']} />
                <Legend />
                <Bar dataKey="totalValue" fill="#93c5fd" name="Total Value" radius={[0, 4, 4, 0]} />
                <Bar dataKey="weighted" fill="#2563eb" name="Weighted Value" radius={[0, 4, 4, 0]} />
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
                  <th className="px-4 py-3 text-right">Probability</th>
                  <th className="px-4 py-3 text-right">Weighted</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(data.byStage || []).map((stage, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage.stage] || '#94a3b8' }} />
                        <span className="font-medium">{stage.stage}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{stage.count}</td>
                    <td className="px-4 py-3 text-right">{formatNaira(stage.totalValue)}</td>
                    <td className="px-4 py-3 text-right">{stage.probability}%</td>
                    <td className="px-4 py-3 text-right font-bold text-primary-600">{formatNaira(stage.weighted)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold text-sm">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{(data.byStage || []).reduce((s, r) => s + r.count, 0)}</td>
                  <td className="px-4 py-3 text-right">{formatNaira(data.totalPipelineValue)}</td>
                  <td className="px-4 py-3 text-right">—</td>
                  <td className="px-4 py-3 text-right text-primary-600">{formatNaira(data.weightedPipeline)}</td>
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
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Territory</th>
                  <th className="px-4 py-3">Sales Rep</th>
                  <th className="px-4 py-3 text-right">Value</th>
                  <th className="px-4 py-3 text-right">Weighted</th>
                  <th className="px-4 py-3">Expected Close</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.topProspects.map((prospect, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/leads/${prospect._id}`} className="font-medium text-primary-600 hover:underline">
                        {prospect.schoolName}
                      </Link>
                      <p className="text-xs text-gray-500">{prospect.schoolId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 text-xs rounded-full font-medium" style={{
                        backgroundColor: `${STAGE_COLORS[prospect.stage] || '#94a3b8'}20`,
                        color: STAGE_COLORS[prospect.stage] || '#94a3b8'
                      }}>
                        {prospect.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">{prospect.territory}</td>
                    <td className="px-4 py-3">{prospect.assignedTo?.fullName || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatNaira(prospect.negotiatedPrice || prospect.proposedPrice)}</td>
                    <td className="px-4 py-3 text-right font-bold text-primary-600">{formatNaira(prospect.weightedValue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{prospect.expectedClosingDate ? new Date(prospect.expectedClosingDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
