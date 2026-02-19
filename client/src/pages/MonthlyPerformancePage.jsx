import { useState, useEffect, useRef, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { getCachedRateMap } from '../services/exchangeRateService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import {
  HiOutlineCurrencyDollar, HiOutlineTrendingUp, HiOutlineTrendingDown,
  HiOutlineUserGroup, HiOutlineChartBar, HiOutlineRefresh, HiOutlineDownload,
  HiOutlineLightningBolt, HiOutlineAdjustments, HiOutlineClipboardList,
  HiOutlineOfficeBuilding, HiOutlineX, HiOutlineSwitchHorizontal
} from 'react-icons/hi';

// ─── Date helpers ────────────────────────────────────────────────────────────
const iso = d => d.toISOString().slice(0, 10);
const todayStr = () => iso(new Date());
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const monthsAgo = n => { const d = new Date(); d.setMonth(d.getMonth() - n); return iso(d); };
const yearsAgo = n => { const d = new Date(); d.setFullYear(d.getFullYear() - n); return iso(d); };

const VIEW_TABS = [
  { key: 'days7',  shortLabel: 'Last 7 Days',    desc: 'Showing data for the last 7 days' },
  { key: 'days30', shortLabel: 'Last 30 Days',   desc: 'Showing data for the last 30 days' },
  { key: 'months', shortLabel: 'Last 12 Months', desc: 'Showing data for the last 12 months' },
  { key: 'years',  shortLabel: 'Last 5 Years',   desc: 'Showing data for the last 5 years' },
  { key: 'custom', shortLabel: 'Custom',          desc: 'Custom date range' },
];

const getRanges = (viewKey, customFrom, customTo) => {
  const t = todayStr();
  switch (viewKey) {
    case 'days7':  return { from: daysAgo(7),    to: t, prevFrom: daysAgo(14),   prevTo: daysAgo(7) };
    case 'days30': return { from: daysAgo(30),   to: t, prevFrom: daysAgo(60),   prevTo: daysAgo(30) };
    case 'years':  return { from: yearsAgo(5),   to: t, prevFrom: yearsAgo(10),  prevTo: yearsAgo(5) };
    case 'custom': return { from: customFrom,    to: customTo, prevFrom: null, prevTo: null };
    default:       return { from: monthsAgo(12), to: t, prevFrom: monthsAgo(24), prevTo: monthsAgo(12) };
  }
};

// ─── Sub-components ──────────────────────────────────────────────────────────
function TrendBadge({ pct, inverse = false }) {
  if (pct === null || pct === undefined) return null;
  const positive = inverse ? pct < 0 : pct > 0;
  const zero = pct === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
      zero ? 'text-gray-400' : positive ? 'text-green-600' : 'text-red-500'
    }`}>
      {!zero && (positive
        ? <HiOutlineTrendingUp className="w-3.5 h-3.5" />
        : <HiOutlineTrendingDown className="w-3.5 h-3.5" />
      )}
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  );
}

function KPICard({ icon: Icon, iconBg, label, value, delta, deltaLabel, inverse }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 leading-tight mt-0.5">{value}</p>
        <div className="flex items-center gap-1 mt-1">
          <TrendBadge pct={delta} inverse={inverse} />
          {deltaLabel && <span className="text-xs text-gray-400">{deltaLabel}</span>}
        </div>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label, fmt }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-bold text-gray-900">
            {p.name.toLowerCase().includes('revenue') || p.name.toLowerCase().includes('commission')
              ? fmt(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MonthlyPerformancePage() {
  const { user } = useAuth();
  const [view, setView] = useState('months');
  const [customFrom, setCustomFrom] = useState(monthsAgo(3));
  const [customTo, setCustomTo]     = useState(todayStr());
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem('analyticsCurrency') || 'USD'
  );
  const [rateMap, setRateMap] = useState({ NGN: 1, USD: 1650 });
  const fmt = v => displayCurrency === 'NGN'
    ? formatCurrency((v || 0) * (rateMap['USD'] || 1650), 'NGN')
    : formatCurrency(v || 0, 'USD');
  const toggleCurrency = c => { setDisplayCurrency(c); localStorage.setItem('analyticsCurrency', c); };

  const [kpis, setKpis]           = useState(null);
  const [kpisPrev, setKpisPrev]   = useState(null);
  const [revenue, setRevenue]     = useState(null);
  const [monthly, setMonthly]     = useState(null);
  const [territory, setTerritory] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [compareOn, setCompareOn]             = useState(false);
  const [compareData, setCompareData]         = useState(null);
  const [compareLoading, setCompareLoading]   = useState(false);

  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshTimer = useRef(null);
  const [showFilters, setShowFilters] = useState(false);

  const ranges = getRanges(view, customFrom, customTo);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const opts = { from: ranges.from, to: ranges.to };
      const [kpiRes, revRes, monRes, terRes] = await Promise.all([
        dashboardService.getKPIs(opts),
        dashboardService.getRevenue(),
        dashboardService.getMonthlyPerformance(),
        dashboardService.getTerritory(opts),
      ]);
      setKpis(kpiRes.data);
      setRevenue(revRes.data);
      setMonthly(monRes.data);
      setTerritory(terRes.data || []);

      if (ranges.prevFrom && ranges.prevTo) {
        const prevRes = await dashboardService.getKPIs({ from: ranges.prevFrom, to: ranges.prevTo });
        setKpisPrev(prevRes.data);
      } else {
        setKpisPrev(null);
      }

      setLastUpdated(new Date());
      getCachedRateMap().then(setRateMap);
    } catch {
      if (!silent) toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [view, customFrom, customTo]); // eslint-disable-line

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    clearInterval(refreshTimer.current);
    if (autoRefresh) {
      refreshTimer.current = setInterval(() => loadAll(true), 60000);
    }
    return () => clearInterval(refreshTimer.current);
  }, [autoRefresh, loadAll]);

  const handleCompare = async () => {
    if (!compareOn) {
      const r = ranges;
      if (!r.prevFrom) { toast.error('No previous period available for custom range'); return; }
      setCompareOn(true);
      setCompareLoading(true);
      try {
        const { data } = await dashboardService.compareStats(r.from, r.to, r.prevFrom, r.prevTo);
        setCompareData(data);
      } catch { toast.error('Compare failed'); }
      setCompareLoading(false);
    } else {
      setCompareOn(false);
      setCompareData(null);
    }
  };

  const exportCSV = () => {
    if (!monthly?.months) return;
    const headers = ['Month', 'Leads Created', 'Deals Closed', 'Revenue (USD)', 'Commission (USD)', 'Avg Deal Size'];
    const rows = monthly.months.map(m => [
      m.month, m.leadsCreated, m.dealsClosed, m.revenue, m.commission, m.avgDealSize
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `analytics_${view}_${todayStr()}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  const calcDelta = (cur, prev) => {
    if (!prev || prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const sortedTerr = [...territory].sort((a, b) => b.revenue - a.revenue);
  const topTerr = sortedTerr[0];

  const kpiCards = kpis ? [
    {
      icon: HiOutlineCurrencyDollar, iconBg: 'bg-green-100 text-green-600',
      label: 'Total Revenue', value: fmt(kpis.totalClosedRevenue),
      delta: calcDelta(kpis.totalClosedRevenue, kpisPrev?.totalClosedRevenue),
      deltaLabel: 'vs prev period',
    },
    {
      icon: HiOutlineChartBar, iconBg: 'bg-blue-100 text-blue-600',
      label: 'Deals Closed', value: kpis.totalClosedWon,
      delta: calcDelta(kpis.totalClosedWon, kpisPrev?.totalClosedWon),
      deltaLabel: 'vs prev period',
    },
    {
      icon: HiOutlineClipboardList, iconBg: 'bg-purple-100 text-purple-600',
      label: 'New Leads', value: (kpis.totalLeadsInPipeline || 0) + (kpis.totalClosedWon || 0) + (kpis.totalClosedLost || 0),
      delta: null,
      deltaLabel: `${kpis.winRate || 0}% conversion rate`,
    },
    {
      icon: HiOutlineOfficeBuilding, iconBg: 'bg-orange-100 text-orange-600',
      label: 'Top Territory', value: topTerr ? fmt(topTerr.revenue) : '—',
      delta: null,
      deltaLabel: topTerr ? `${topTerr.territory || topTerr.state} leading` : 'No data',
    },
    {
      icon: HiOutlineLightningBolt, iconBg: 'bg-yellow-100 text-yellow-600',
      label: 'Pipeline Value', value: fmt(kpis.activePipelineValue),
      delta: calcDelta(kpis.activePipelineValue, kpisPrev?.activePipelineValue),
      deltaLabel: `${kpis.totalLeadsInPipeline || 0} active leads`,
    },
  ] : [];

  const trendData = (revenue?.monthlyRevenue || []).map(m => ({
    month: m.month,
    Revenue: Math.round(m.revenue || 0),
    Deals: m.deals || 0,
  }));

  const monthRows = monthly?.months || [];
  const totals = monthly?.totals || {};
  const viewDesc = VIEW_TABS.find(t => t.key === view)?.desc || '';

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-0">

      {/* ── Top Header ──────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Analytics Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">Monitor your business performance and growth</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Export */}
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              <HiOutlineDownload className="w-4 h-4" />
              Export
            </button>

            {/* Auto-refresh */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <span className="text-xs text-gray-500 font-medium">Auto-refresh</span>
              <button
                onClick={() => setAutoRefresh(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${autoRefresh ? 'bg-blue-500' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${autoRefresh ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Compare */}
            <button onClick={handleCompare} disabled={compareLoading}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border transition-all ${
                compareOn
                  ? 'bg-primary-50 border-primary-400 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600'
              }`}>
              <HiOutlineSwitchHorizontal className="w-4 h-4" />
              Compare
            </button>

            {/* Filters */}
            <button onClick={() => setShowFilters(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-primary-300">
              <HiOutlineAdjustments className="w-4 h-4" />
              Filters
            </button>

            {/* Currency toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
              <button onClick={() => toggleCurrency('USD')} className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all ${displayCurrency === 'USD' ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>$ USD</button>
              <button onClick={() => toggleCurrency('NGN')} className={`px-2.5 py-1.5 text-xs rounded-lg font-semibold transition-all ${displayCurrency === 'NGN' ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>₦ NGN</button>
            </div>

            {/* Refresh */}
            <button onClick={() => loadAll()}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-gray-700 transition-colors">
              <HiOutlineRefresh className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-600 font-medium">Data updated</span>
          </div>
          {lastUpdated && (
            <p className="text-xs text-gray-400">Last updated: {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>
      </div>

      <div className="px-6 space-y-6">

        {/* ── Filter Panel ────────────────────────────────────────── */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Date Range Filter</p>
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                <HiOutlineX className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="input-field text-sm py-1.5 w-36" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="input-field text-sm py-1.5 w-36" />
              </div>
              <button onClick={() => { setView('custom'); loadAll(); }} className="btn-primary text-sm py-1.5">Apply</button>
            </div>
          </div>
        )}

        {/* ── View-by Tabs ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-gray-400 font-medium mr-2">View by:</span>
            {VIEW_TABS.map(t => (
              <button key={t.key} onClick={() => setView(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  view === t.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}>
                {t.shortLabel}
              </button>
            ))}
            <button onClick={() => loadAll()} className="ml-2 text-gray-400 hover:text-gray-600">
              <HiOutlineRefresh className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">{viewDesc}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
        ) : (
          <>
            {/* ── 5 KPI Cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {kpiCards.map((card, i) => <KPICard key={i} {...card} />)}
            </div>

            {/* ── Quick Stats Row ──────────────────────────────────────── */}
            {kpis && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Win Rate',           value: `${kpis.winRate || 0}%`,   sub: `${kpis.totalClosedWon || 0}W / ${kpis.totalClosedLost || 0}L` },
                  { label: 'Weighted Forecast',  value: fmt(kpis.weightedForecast), sub: 'Probability-adjusted' },
                  { label: 'Avg Deal Size',       value: fmt(kpis.averageDealSize),  sub: 'Per closed deal' },
                  { label: 'Overdue Follow-ups', value: kpis.overdueFollowUps || 0, sub: `${kpis.followUpsDueToday || 0} due today`, alert: (kpis.overdueFollowUps || 0) > 0 },
                ].map((s, i) => (
                  <div key={i} className={`bg-white rounded-2xl border shadow-sm p-4 ${s.alert ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                    <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">{s.label}</p>
                    <p className={`text-xl font-extrabold mt-1 ${s.alert ? 'text-red-600' : 'text-gray-900'}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Sales Trend Chart ────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Sales Trend</h3>
                <span className="text-xs text-gray-400 font-medium">Last 12 Months</span>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#818CF8" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rev"
                    tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                    tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="deals" orientation="right" allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip fmt={fmt} />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                    formatter={v => <span style={{ color: '#64748b' }}>{v}</span>} />
                  <Area yAxisId="rev" type="monotone" dataKey="Revenue"
                    stroke="#818CF8" strokeWidth={2.5} fill="url(#revenueGrad)"
                    dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                  <Line yAxisId="deals" type="monotone" dataKey="Deals"
                    stroke="#34D399" strokeWidth={2} strokeDasharray="5 3"
                    dot={{ r: 3.5, fill: '#34D399', strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* ── Compare Results ─────────────────────────────────────── */}
            {compareLoading && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-8 flex justify-center">
                <LoadingSpinner />
              </div>
            )}

            {compareOn && compareData && !compareLoading && (() => {
              const pA = compareData.periodA || {};
              const pB = compareData.periodB || {};
              const lA = compareData.labels?.A || 'Current Period';
              const lB = compareData.labels?.B || 'Previous Period';
              const barData = [
                { name: 'Revenue',    [lA]: Math.round(pA.totalRevenue || 0),    [lB]: Math.round(pB.totalRevenue || 0) },
                { name: 'Pipeline',   [lA]: Math.round(pA.pipelineValue || 0),   [lB]: Math.round(pB.pipelineValue || 0) },
                { name: 'Commission', [lA]: Math.round(pA.totalCommission || 0), [lB]: Math.round(pB.totalCommission || 0) },
              ];
              const countData = [
                { name: 'New Leads',  [lA]: pA.newLeads || 0,  [lB]: pB.newLeads || 0 },
                { name: 'Deals Won',  [lA]: pA.closedWon || 0, [lB]: pB.closedWon || 0 },
                { name: 'Deals Lost', [lA]: pA.closedLost || 0,[lB]: pB.closedLost || 0 },
              ];
              return (
                <div className="bg-white rounded-2xl border border-primary-100 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <HiOutlineSwitchHorizontal className="w-5 h-5 text-primary-500" />
                      Period Comparison
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                        <span className="font-semibold text-blue-700">{lA}</span>
                      </span>
                      <span className="text-gray-300">vs</span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-gray-400 inline-block" />
                        <span className="font-semibold text-gray-500">{lB}</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Revenue Metrics</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={barData} barGap={3}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, '']} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey={lA} fill="#3B82F6" radius={[4,4,0,0]} />
                          <Bar dataKey={lB} fill="#CBD5E1" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Activity Counts</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={countData} barGap={3}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey={lA} fill="#10B981" radius={[4,4,0,0]} />
                          <Bar dataKey={lB} fill="#A7F3D0" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Change summary badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'totalRevenue', label: 'Revenue' },
                      { key: 'closedWon',    label: 'Deals Won' },
                      { key: 'newLeads',     label: 'New Leads' },
                      { key: 'winRate',      label: 'Win Rate', suffix: '%' },
                    ].map(m => {
                      const chg = compareData.changes?.[m.key];
                      const good = m.key === 'closedLost' ? chg < 0 : chg > 0;
                      const bad  = m.key === 'closedLost' ? chg > 0 : chg < 0;
                      return (
                        <div key={m.key} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                          <p className="text-xs text-gray-400 mb-1">{m.label}</p>
                          <div className={`text-lg font-extrabold ${good ? 'text-green-600' : bad ? 'text-red-500' : 'text-gray-500'}`}>
                            {chg === null || chg === undefined ? 'N/A' : `${chg > 0 ? '↑' : chg < 0 ? '↓' : '–'}${Math.abs(chg)}%`}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {m.suffix
                              ? `${pA[m.key] || 0}${m.suffix} vs ${pB[m.key] || 0}${m.suffix}`
                              : `${pA[m.key] || 0} vs ${pB[m.key] || 0}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Territory Performance ────────────────────────────────── */}
            {sortedTerr.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Territory Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase border-b">
                        <th className="pb-3 pr-4">Territory</th>
                        <th className="pb-3 pr-4 text-right">Total Leads</th>
                        <th className="pb-3 pr-4 text-right">Active</th>
                        <th className="pb-3 pr-4 text-right">Closed Won</th>
                        <th className="pb-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedTerr.map((t, i) => {
                        const pct = sortedTerr[0]?.revenue > 0 ? (t.revenue / sortedTerr[0].revenue) * 100 : 0;
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-8 rounded-full" style={{ background: `hsl(${210 + i * 35}, 70%, 55%)` }} />
                                <div>
                                  <p className="font-semibold text-gray-800">{t.territory || t.state}</p>
                                  <div className="w-24 bg-gray-100 rounded-full h-1 mt-1">
                                    <div className="h-1 rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-right text-gray-600">{t.totalLeads}</td>
                            <td className="py-3 pr-4 text-right text-blue-600 font-medium">{t.activeLeads}</td>
                            <td className="py-3 pr-4 text-right text-green-600 font-bold">{t.closedWon}</td>
                            <td className="py-3 text-right font-extrabold text-gray-900">{fmt(t.revenue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Monthly Breakdown Table ──────────────────────────────── */}
            {monthRows.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900">Monthly Breakdown</h3>
                  <button onClick={exportCSV} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                    <HiOutlineDownload className="w-3.5 h-3.5" /> Download CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase border-b">
                        <th className="pb-3 pr-4">Month</th>
                        <th className="pb-3 pr-4 text-right">Leads</th>
                        <th className="pb-3 pr-4 text-right">Closed</th>
                        <th className="pb-3 pr-4 text-right">Conv %</th>
                        <th className="pb-3 pr-4 text-right">Revenue</th>
                        <th className="pb-3 text-right">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {monthRows.map((m, i) => {
                        const conv = m.leadsCreated > 0
                          ? Math.round((m.dealsClosed / m.leadsCreated) * 100) : 0;
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="py-3 pr-4 font-semibold text-gray-800">{m.month}</td>
                            <td className="py-3 pr-4 text-right text-gray-500">{m.leadsCreated}</td>
                            <td className="py-3 pr-4 text-right font-bold text-gray-900">{m.dealsClosed}</td>
                            <td className="py-3 pr-4 text-right">
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                conv >= 50 ? 'bg-green-100 text-green-700' :
                                conv >= 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                              }`}>{conv}%</span>
                            </td>
                            <td className="py-3 pr-4 text-right font-bold text-green-600">{fmt(m.revenue)}</td>
                            <td className="py-3 text-right text-purple-600">{fmt(m.commission)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200 font-bold bg-gray-50">
                        <td className="py-3 pr-4 text-gray-800">TOTAL</td>
                        <td className="py-3 pr-4 text-right text-gray-600">{totals.totalLeadsCreated}</td>
                        <td className="py-3 pr-4 text-right text-gray-900">{totals.totalDealsClosed}</td>
                        <td className="py-3 pr-4 text-right">
                          {totals.totalLeadsCreated > 0
                            ? <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                {Math.round((totals.totalDealsClosed / totals.totalLeadsCreated) * 100)}%
                              </span>
                            : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right text-green-700">{fmt(totals.totalRevenue)}</td>
                        <td className="py-3 text-right text-purple-700">{fmt(totals.totalCommission)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
