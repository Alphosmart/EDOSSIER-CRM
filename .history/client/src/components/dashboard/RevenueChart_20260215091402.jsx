import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNaira } from '../../utils/formatCurrency';

export default function RevenueChart({ data }) {
  if (!data || !data.monthlyRevenue) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
        <p className="text-gray-500 text-center py-8">No revenue data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-600">Closed: {formatNaira(data.totalClosed)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-gray-600">Forecast: {formatNaira(data.forecast)}</span>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.monthlyRevenue} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => formatNaira(value)} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
