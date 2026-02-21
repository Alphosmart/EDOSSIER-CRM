import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16'];

const LEVEL_LABELS = {
  country: 'Country',
  state:   'State / Territory',
  lga:     'LGA / City'
};

export default function GeographyChart({ data, level, fmt, loading }) {
  const levelLabel = LEVEL_LABELS[level] || 'Location';

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Breakdown – {levelLabel}</h3>
        <div className="flex justify-center items-center py-12 text-sm text-gray-400">
          <svg className="animate-spin w-5 h-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Loading…
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Geographic Breakdown – {levelLabel}</h3>
        <p className="text-gray-400 text-center py-10">No data for this selection.</p>
      </div>
    );
  }

  const display = fmt || ((v) => `$${Number(v).toLocaleString()}`);
  const fmtTick = (v) => {
    const raw = display(v);
    // Strip currency symbol and abbreviate if large
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (num >= 1_000_000) return raw[0] + (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000)     return raw[0] + (num / 1_000).toFixed(0) + 'k';
    return raw;
  };

  // Show at most top 15 in the chart, but all in the table
  const chartData = data.slice(0, 15);

  return (
    <div className="card space-y-5">
      <h3 className="text-lg font-semibold text-gray-900">Geographic Breakdown – {levelLabel}</h3>

      {/* Bar chart: totalLeads + revenue per location */}
      <div style={{ height: Math.max(220, Math.min(chartData.length * 32, 380)) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tickFormatter={fmtTick} tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name) => [
                name === 'revenue' || name === 'pipelineValue'
                  ? display(value)
                  : value,
                name === 'revenue'      ? 'Revenue' :
                name === 'pipelineValue'? 'Pipeline' :
                name === 'totalLeads'   ? 'Total Leads' :
                name
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="totalLeads"   name="Total Leads" fill="#3B82F6" radius={[0, 4, 4, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full data table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase border-b">
              <th className="pb-2 pr-4">{levelLabel}</th>
              <th className="pb-2 pr-4 text-right">Total</th>
              <th className="pb-2 pr-4 text-right">Active</th>
              <th className="pb-2 pr-4 text-right">Won</th>
              <th className="pb-2 pr-4 text-right">Win %</th>
              <th className="pb-2 pr-4 text-right">Revenue</th>
              <th className="pb-2 text-right">Pipeline</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row, i) => (
              <tr key={row.name} className="hover:bg-gray-50">
                <td className="py-2.5 pr-4 font-medium text-gray-800">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm mr-2"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  {row.name}
                </td>
                <td className="py-2.5 pr-4 text-right">{row.totalLeads}</td>
                <td className="py-2.5 pr-4 text-right text-blue-600">{row.activeLeads}</td>
                <td className="py-2.5 pr-4 text-right text-green-600">{row.closedWon}</td>
                <td className="py-2.5 pr-4 text-right">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    row.winRate >= 60 ? 'bg-green-100 text-green-700' :
                    row.winRate >= 30 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {row.winRate}%
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right font-medium">{display(row.revenue)}</td>
                <td className="py-2.5 text-right text-gray-500">{display(row.pipelineValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
