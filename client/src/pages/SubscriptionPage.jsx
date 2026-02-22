import { useState, useEffect } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { formatCurrency } from '../utils/formatCurrency';
import { getCachedRateMap } from '../services/exchangeRateService';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatDate';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  HiOutlineCurrencyDollar, HiOutlineRefresh, HiOutlineExclamation,
  HiOutlineCalendar, HiOutlineUserGroup, HiOutlineTrendingUp
} from 'react-icons/hi';

const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export default function SubscriptionPage() {
  const { user, hasRole } = useAuth();
  const isAdminOrManager = hasRole('admin', 'manager');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rateMap, setRateMap] = useState({ NGN: 1, USD: 1650 });

  // Currency toggle (persisted) — subscription data is stored in NGN
  const currencyKey = user ? `subscriptionCurrency_${user._id}` : 'subscriptionCurrency';
  const defaultCurrency = isAdminOrManager ? 'USD' : 'NGN';
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
    loadData();
    getCachedRateMap().then(setRateMap);
  }, []);

  const loadData = async () => {
    try {
      const { data: res } = await subscriptionService.getSummary();
      setData(res);
    } catch (error) {
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!data) return <div className="text-center py-12 text-gray-500">No data available</div>;

  const kpis = [
    { label: 'Monthly Recurring Revenue', value: fmt(data.totalMRR), icon: HiOutlineCurrencyDollar, color: 'bg-blue-50 text-blue-600' },
    { label: 'Annual Recurring Revenue', value: fmt(data.totalARR), icon: HiOutlineTrendingUp, color: 'bg-green-50 text-green-600' },
    { label: 'Active Subscriptions', value: data.activeSubscriptions, icon: HiOutlineUserGroup, color: 'bg-purple-50 text-purple-600' },
    { label: 'Avg Revenue/School', value: fmt(data.avgRevenuePerSchool), icon: HiOutlineCurrencyDollar, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Renewals Due (30d)', value: data.renewalsDue30, icon: HiOutlineCalendar, color: data.renewalsDue30 > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-50 text-gray-600' },
    { label: 'Overdue Renewals', value: data.overdueRenewals, icon: HiOutlineExclamation, color: data.overdueRenewals > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600' },
    { label: 'Revenue at Risk', value: fmt(data.revenueAtRisk), icon: HiOutlineExclamation, color: data.revenueAtRisk > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600' },
    { label: 'Amount Outstanding', value: fmt(data.amountOutstanding), icon: HiOutlineCurrencyDollar, color: data.amountOutstanding > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">Subscription Summary</h1>
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
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Mix Chart */}
        {data.subscriptionMix && data.subscriptionMix.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Subscription Type Mix</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.subscriptionMix}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="revenue"
                  nameKey="type"
                  label={({ type, count }) => `${type}: ${count}`}
                >
                  {data.subscriptionMix.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {data.subscriptionMix.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="font-medium">{item.type}</span>
                    <span className="text-gray-500">({item.count} schools)</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{fmt(item.revenue)}</span>
                    <span className="text-gray-500 ml-2 text-xs">MRR: {fmt(item.mrr)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan Breakdown Chart */}
        {data.planBreakdown && data.planBreakdown.length > 0 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Plan Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.planBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="plan" />
                <YAxis tickFormatter={yAxisFmt} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Legend />
                <Bar dataKey="revenue" fill="#2563eb" name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {data.planBreakdown.map((plan, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p className="font-semibold">{plan.plan}</p>
                  <p className="text-gray-500">{plan.count} schools</p>
                  <p className="font-bold text-primary-600">{fmt(plan.revenue)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plan Conversion Analysis */}
      {data.conversionStats && data.conversionStats.total > 0 && (() => {
        const PCT = (n) => data.conversionStats.total > 0 ? Math.round(n / data.conversionStats.total * 100) : 0;
        const ALL_PLANS = ['Free', 'Basic', 'Deluxe', 'Premium', 'Enterprise', 'Custom'];
        return (
          <div className="card">
            <h3 className="text-lg font-semibold mb-1">Proposed vs Actual Plan</h3>
            <p className="text-sm text-gray-500 mb-5">For closed deals — comparing the plan pitched to the plan signed</p>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-3xl font-extrabold text-green-600">{data.conversionStats.matched}</p>
                <p className="text-xs font-semibold text-green-700 mt-1">✓ Matched</p>
                <p className="text-xs text-gray-500">{PCT(data.conversionStats.matched)}% of proposals</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-3xl font-extrabold text-blue-600">{data.conversionStats.upgraded}</p>
                <p className="text-xs font-semibold text-blue-700 mt-1">↑ Upgraded</p>
                <p className="text-xs text-gray-500">{PCT(data.conversionStats.upgraded)}% of proposals</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <p className="text-3xl font-extrabold text-yellow-600">{data.conversionStats.downgraded}</p>
                <p className="text-xs font-semibold text-yellow-700 mt-1">↓ Downgraded</p>
                <p className="text-xs text-gray-500">{PCT(data.conversionStats.downgraded)}% of proposals</p>
              </div>
            </div>

            {/* Stacked bar chart: for each proposed plan, show actual plan outcomes */}
            {data.planConversion && data.planConversion.length > 0 && (
              <>
                <p className="text-xs text-gray-400 mb-2 text-center">Each bar = a proposed plan. Segments show what plan was actually signed.</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.planConversion} margin={{ bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="proposed" label={{ value: 'Proposed Plan', position: 'insideBottom', offset: -10 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend verticalAlign="top" />
                    {ALL_PLANS.map((plan, i) => (
                      <Bar key={plan} dataKey={plan} stackId="a" fill={COLORS[i % COLORS.length]} name={plan} />
                    ))}
                    <Bar key="None" dataKey="None" stackId="a" fill="#e5e7eb" name="No Plan Set" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        );
      })()}

      {/* Renewal Alerts */}
      {data.renewalAlerts && data.renewalAlerts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <HiOutlineCalendar className="w-5 h-5 text-yellow-500" />
            Renewal Alerts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs">
                    <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Proposed</th>
                    <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Renewal Date</th>
                  <th className="px-4 py-3">Days Left</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Territory</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.renewalAlerts.map((alert, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/leads/${alert._id}`} className="font-medium text-primary-600 hover:underline">
                        {alert.schoolName}
                      </Link>
                      <p className="text-xs text-gray-500">{alert.schoolId}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{alert.proposedPackage || '—'}</td>
                    <td className="px-4 py-3">
                      {alert.proposedPackage && alert.subscriptionPlan && alert.proposedPackage !== alert.subscriptionPlan ? (() => {
                        const PLAN_ORDER = ['Free', 'Basic', 'Deluxe', 'Premium', 'Enterprise', 'Custom'];
                        const ai = PLAN_ORDER.indexOf(alert.subscriptionPlan);
                        const pi = PLAN_ORDER.indexOf(alert.proposedPackage);
                        return (
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium">{alert.subscriptionPlan}</span>
                            <span className={`px-1.5 py-0.5 text-xs rounded font-bold ${
                              ai > pi ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>{ai > pi ? '↑' : '↓'}</span>
                          </span>
                        );
                      })() : <span>{alert.subscriptionPlan || '—'}</span>}
                    </td>
                    <td className="px-4 py-3">{alert.subscriptionType || '—'}</td>
                    <td className="px-4 py-3">{formatDate(alert.renewalDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        alert.daysUntilRenewal < 0 ? 'bg-red-100 text-red-700' :
                        alert.daysUntilRenewal <= 7 ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {alert.daysUntilRenewal < 0 ? `${Math.abs(alert.daysUntilRenewal)}d overdue` : `${alert.daysUntilRenewal}d`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold">{fmt(alert.negotiatedPrice)}</td>
                    <td className="px-4 py-3">{alert.territory}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.renewalAlerts?.length === 0 && data.activeSubscriptions > 0 && (
        <div className="card bg-green-50 border-green-200 text-center py-8">
          <p className="text-green-700 font-medium">All subscriptions are healthy — no renewals due soon!</p>
        </div>
      )}
    </div>
  );
}
