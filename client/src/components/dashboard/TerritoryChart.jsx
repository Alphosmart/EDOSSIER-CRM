import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatNaira } from '../../utils/formatCurrency';

const TERRITORY_COLORS = {
  revenue: '#10B981',
  pipelineValue: '#3B82F6'
};

export default function TerritoryChart({ data, fmt }) {
  // fmt is injected from parent; fall back to NGN display if not provided
  const display = fmt || ((v) => formatNaira(v));

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Territory Performance</h3>
        <p className="text-gray-500 text-center py-8">No territory data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Territory Performance</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="territory" />
            <YAxis tickFormatter={(v) => display(v).replace(/[₦$]/, '').split('.')[0]} />
            <Tooltip formatter={(value) => [display(value), '']} />
            <Legend />
            <Bar dataKey="revenue" fill={TERRITORY_COLORS.revenue} name="Revenue" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pipelineValue" fill={TERRITORY_COLORS.pipelineValue} name="Pipeline" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
