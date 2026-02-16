import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatNaira } from '../../utils/formatCurrency';

const STATUS_CHART_COLORS = {
  'Not Interested': '#9CA3AF',
  'Interested': '#3B82F6',
  'Needs Proposal': '#F59E0B',
  'Needs Approval': '#F97316',
  'Demo Scheduled': '#8B5CF6',
  'Proposal Sent': '#6366F1',
  'Negotiation': '#EC4899',
  'Closed Won': '#10B981',
  'Closed Lost': '#EF4444'
};

export default function PipelineChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h3>
        <p className="text-gray-500 text-center py-8">No pipeline data available</p>
      </div>
    );
  }

  const chartData = data
    .filter(d => d.count > 0)
    .map(d => ({
      ...d,
      shortStatus: d.status.length > 12 ? d.status.substring(0, 12) + '…' : d.status
    }));

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Overview</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="shortStatus" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'value') return formatNaira(value);
                return value;
              }}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.status || label}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={STATUS_CHART_COLORS[entry.status] || '#6B7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
