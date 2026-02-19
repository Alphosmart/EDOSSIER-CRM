import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid,
  PolarAngleAxis
} from 'recharts';
import { dashboardService } from '../services/dashboardService';
import { leadService } from '../services/leadService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { getCachedRateMap } from '../services/exchangeRateService';
import KPICard from '../components/dashboard/KPICard';
import PipelineChart from '../components/dashboard/PipelineChart';
import RevenueChart from '../components/dashboard/RevenueChart';
import TerritoryChart from '../components/dashboard/TerritoryChart';
import OverdueAlerts from '../components/dashboard/OverdueAlerts';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  HiOutlineCurrencyDollar, HiOutlineTrendingUp, HiOutlineUserGroup,
  HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineExclamation,
  HiOutlineCalendar, HiOutlineLightningBolt, HiOutlineClipboardList,
  HiOutlineOfficeBuilding, HiOutlineCog, HiOutlineArrowRight, HiOutlineUsers,
  HiOutlineSwitchHorizontal
} from 'react-icons/hi';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const isAdminOrManager = hasRole('admin', 'manager');

  const [kpis, setKpis] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [territory, setTerritory] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [today, setToday] = useState([]);
  const [loading, setLoading] = useState(true);

  // Currency toggle (persisted)
  const currencyKey = user ? `dashCurrency_${user._id}` : 'dashCurrency';
  const defaultCurrency = isAdminOrManager ? 'USD' : 'NGN';
  const [displayCurrency, setDisplayCurrency] = useState(
    () => localStorage.getItem(currencyKey) || defaultCurrency
  );
  const [rateMap, setRateMap] = useState({ NGN: 1, USD: 1650 });
  const toggleCurrency = (c) => { setDisplayCurrency(c); localStorage.setItem(currencyKey, c); };
  const fmt = (usdAmt) => displayCurrency === 'NGN'
    ? formatCurrency((usdAmt || 0) * (rateMap['USD'] || 1650), 'NGN')
    : formatCurrency(usdAmt || 0, 'USD');

  // Stats comparison
  const getMonthStart = (offset = 0) => {
    const d = new Date(); d.setDate(1);
    d.setMonth(d.getMonth() + offset);
    return d.toISOString().slice(0, 10);
  };
  const getMonthEnd = (offset = 0) => {
    const d = new Date(); d.setDate(1);
    d.setMonth(d.getMonth() + offset + 1);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const [showCompare, setShowCompare] = useState(false);
  const [compA, setCompA] = useState({ from: getMonthStart(0), to: getMonthEnd(0) }); // this month
  const [compB, setCompB] = useState({ from: getMonthStart(-1), to: getMonthEnd(-1) }); // last month
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const runComparison = async (aOverride, bOverride) => {
    const a = aOverride || compA;
    const b = bOverride || compB;
    setCompareLoading(true);
    try {
      const { data } = await dashboardService.compareStats(a.from, a.to, b.from, b.to);
      setCompareData(data);
    } catch (e) {}
    setCompareLoading(false);
  };

  useEffect(() => { getCachedRateMap().then(setRateMap); }, []);

  // Date range filter
  const getDefaultFrom = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  };
  const [dateFrom, setDateFrom] = useState(getDefaultFrom());
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async (from = dateFrom, to = dateTo) => {
    setLoading(true);
    try {
      const opts = { from, to };
      const promises = [
        dashboardService.getKPIs(opts),
        dashboardService.getPipeline(opts),
        dashboardService.getRevenue(opts),
        leadService.getOverdue(),
        leadService.getToday()
      ];
      // Only load territory data for admin/manager
      if (isAdminOrManager) {
        promises.push(dashboardService.getTerritory(opts));
      }

      const results = await Promise.all(promises);
      setKpis(results[0].data);
      setPipeline(results[1].data);
      setRevenue(results[2].data);
      setOverdue(results[3].data);
      setToday(results[4].data);
      if (isAdminOrManager && results[5]) {
        setTerritory(results[5].data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => loadDashboard(dateFrom, dateTo);

  const handleResetFilter = () => {
    const from = getDefaultFrom();
    const to = new Date().toISOString().slice(0, 10);
    setDateFrom(from);
    setDateTo(to);
    loadDashboard(from, to);
  };

  if (loading) return <LoadingSpinner size="lg" />;

  // ────── ADMIN / MANAGER DASHBOARD ──────
  if (isAdminOrManager) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Management Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Organisation-wide overview</p>
          </div>
          {/* Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={e => setDateFrom(e.target.value)}
                className="input-field py-1.5 text-sm w-36"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={new Date().toISOString().slice(0, 10)}
                onChange={e => setDateTo(e.target.value)}
                className="input-field py-1.5 text-sm w-36"
              />
            </div>
            <button onClick={handleApplyFilter} className="btn-primary text-sm py-1.5 px-3">Apply</button>
            <button onClick={handleResetFilter} className="btn-secondary text-sm py-1.5 px-3">Reset</button>
            {/* Currency toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
              <button onClick={() => toggleCurrency('USD')} className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${displayCurrency === 'USD' ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>$ USD</button>
              <button onClick={() => toggleCurrency('NGN')} className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${displayCurrency === 'NGN' ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>₦ NGN</button>
            </div>
          </div>
        </div>

        {/* Row 1 – Revenue & Deals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Revenue" value={fmt(kpis?.totalClosedRevenue)} subtitle={`${kpis?.totalClosedWon || 0} deals closed`} icon={HiOutlineCurrencyDollar} color="green" />
          <KPICard title="Pipeline Value" value={fmt(kpis?.activePipelineValue)} subtitle={`${kpis?.totalLeadsInPipeline || 0} active leads`} icon={HiOutlineUserGroup} color="primary" />
          <KPICard title="Weighted Forecast" value={fmt(kpis?.weightedForecast)} subtitle="Probability-adjusted" icon={HiOutlineTrendingUp} color="indigo" />
          <KPICard title="Avg Deal Size" value={fmt(kpis?.averageDealSize)} icon={HiOutlineChartBar} color="pink" />
        </div>

        {/* Row 2 – Performance & Commission */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Win Rate" value={`${kpis?.winRate || 0}%`} subtitle={`${kpis?.totalClosedWon || 0}W / ${kpis?.totalClosedLost || 0}L`} icon={HiOutlineCheckCircle} color="purple" />
          <KPICard title="Total Commission Paid" value={fmt(kpis?.totalCommissionEarned)} icon={HiOutlineLightningBolt} color="yellow" />
          <KPICard title="Overdue Follow-ups" value={kpis?.overdueFollowUps || 0} icon={HiOutlineExclamation} color={kpis?.overdueFollowUps > 0 ? 'red' : 'green'} />
          <KPICard title="Due Today" value={kpis?.followUpsDueToday || 0} icon={HiOutlineCalendar} color="orange" />
        </div>

        {/* Admin Quick Actions (admin only) */}
        {hasRole('admin') && (
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Admin Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link to="/settings?tab=commission"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
                    <HiOutlineCurrencyDollar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Commission Rates</p>
                    <p className="text-xs text-gray-400">Set % per team member</p>
                  </div>
                </div>
                <HiOutlineArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500" />
              </Link>
              <Link to="/users"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <HiOutlineUsers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Manage Users</p>
                    <p className="text-xs text-gray-400">Add or edit team members</p>
                  </div>
                </div>
                <HiOutlineArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500" />
              </Link>
              <Link to="/commissions"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50 text-green-600">
                    <HiOutlineLightningBolt className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">Commission Payouts</p>
                    <p className="text-xs text-gray-400">Approve &amp; disburse payments</p>
                  </div>
                </div>
                <HiOutlineArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500" />
              </Link>
            </div>
          </div>
        )}

        {/* Charts – Pipeline & Overdue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PipelineChart data={pipeline} />
          <OverdueAlerts overdue={overdue} today={today} />
        </div>

        {/* Charts – Revenue & Territory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart data={revenue} />
          <TerritoryChart data={territory} />
        </div>

        {/* ──── Compare Periods ──── */}
        <CompareSection
          compA={compA} setCompA={setCompA}
          compB={compB} setCompB={setCompB}
          showCompare={showCompare} setShowCompare={setShowCompare}
          runComparison={runComparison}
          compareData={compareData} compareLoading={compareLoading}
          fmt={fmt}
        />
      </div>
    );
  }

  // ────── SALES REP / TEAM LEAD DASHBOARD ──────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">My Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.firstName}!</p>
        </div>
        {/* Date Range Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={e => setDateFrom(e.target.value)}
              className="input-field py-1.5 text-sm w-36"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setDateTo(e.target.value)}
              className="input-field py-1.5 text-sm w-36"
            />
          </div>
          <button onClick={handleApplyFilter} className="btn-primary text-sm py-1.5 px-3">Apply</button>
          <button onClick={handleResetFilter} className="btn-secondary text-sm py-1.5 px-3">Reset</button>
          {/* Currency toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
            <button onClick={() => toggleCurrency('USD')} className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${displayCurrency === 'USD' ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>$ USD</button>
            <button onClick={() => toggleCurrency('NGN')} className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${displayCurrency === 'NGN' ? 'bg-green-600 text-white shadow' : 'text-gray-500'}`}>₦ NGN</button>
          </div>
        </div>
      </div>

      {/* Row 1 – Personal KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="My Pipeline" value={kpis?.totalLeadsInPipeline || 0} subtitle={`Value: ${fmt(kpis?.activePipelineValue)}`} icon={HiOutlineClipboardList} color="primary" />
        <KPICard title="My Revenue" value={fmt(kpis?.totalClosedRevenue)} subtitle={`${kpis?.totalClosedWon || 0} deals closed`} icon={HiOutlineCurrencyDollar} color="green" />
        <KPICard title="My Commission" value={fmt(kpis?.totalCommissionEarned)} icon={HiOutlineLightningBolt} color="yellow" />
        <KPICard title="Win Rate" value={`${kpis?.winRate || 0}%`} subtitle={`${kpis?.totalClosedWon || 0}W / ${kpis?.totalClosedLost || 0}L`} icon={HiOutlineCheckCircle} color="purple" />
      </div>

      {/* Row 2 – Action items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Overdue Follow-ups" value={kpis?.overdueFollowUps || 0} icon={HiOutlineExclamation} color={kpis?.overdueFollowUps > 0 ? 'red' : 'green'} />
        <KPICard title="Due Today" value={kpis?.followUpsDueToday || 0} icon={HiOutlineCalendar} color="orange" />
        <KPICard title="Weighted Forecast" value={fmt(kpis?.weightedForecast)} subtitle="Probability-adjusted" icon={HiOutlineTrendingUp} color="indigo" />
        <KPICard title="Avg Deal Size" value={fmt(kpis?.averageDealSize)} icon={HiOutlineChartBar} color="pink" />
      </div>

      {/* Target vs Actual */}
      {user?.monthlyTarget > 0 && (
        <TargetCard target={user.monthlyTarget} actual={kpis?.totalClosedRevenue || 0} fmt={fmt} rateMap={rateMap} displayCurrency={displayCurrency} />
      )}

      {/* Charts – Pipeline & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineChart data={pipeline} />
        <OverdueAlerts overdue={overdue} today={today} />
      </div>

      {/* Revenue chart only */}
      <RevenueChart data={revenue} />

      {/* ──── Compare Periods ──── */}
      <CompareSection
        compA={compA} setCompA={setCompA}
        compB={compB} setCompB={setCompB}
        showCompare={showCompare} setShowCompare={setShowCompare}
        runComparison={runComparison}
        compareData={compareData} compareLoading={compareLoading}
        fmt={fmt}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────────
// Target vs Actual card
// ──────────────────────────────────────────────────────────────────────────────────
function TargetCard({ target, actual, fmt, rateMap, displayCurrency }) {
  // target is stored in USD, convert if needed for display
  const displayTarget = displayCurrency === 'NGN'
    ? target * (rateMap['USD'] || 1650)
    : target;
  const pct = Math.min(Math.round((actual / target) * 100), 100);
  const remaining = Math.max(target - actual, 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">Monthly Target Progress</h3>
        <span className={`text-sm font-bold ${
          pct >= 100 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'
        }`}>{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
        <div
          className={`h-3 rounded-full transition-all ${
            pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-sm">
        <div>
          <p className="text-gray-500">Achieved</p>
          <p className="font-bold text-gray-900">{fmt(actual)}</p>
        </div>
        <div className="text-right">
          <p className="text-gray-500">Target</p>
          <p className="font-bold text-gray-900">{displayCurrency === 'NGN' ? formatCurrency(displayTarget, 'NGN') : formatCurrency(displayTarget, 'USD')}</p>
        </div>
      </div>
      {pct < 100 && (
        <p className="text-xs text-gray-400 mt-2">Still needs {fmt(remaining)} to hit target</p>
      )}
      {pct >= 100 && (
        <p className="text-xs text-green-600 mt-2 font-medium">🎉 Target achieved!</p>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────────
// Stats Comparison panel
// ──────────────────────────────────────────────────────────────────────────────────
function CompareSection({ compA, setCompA, compB, setCompB, showCompare, setShowCompare, runComparison, compareData, compareLoading, fmt }) {
  const [mode, setMode] = useState('presets'); // 'presets' | 'custom'
  const [activePreset, setActivePreset] = useState(null);

  const METRICS = [
    { key: 'newLeads',        label: 'New Leads',       currency: false },
    { key: 'closedWon',       label: 'Deals Won',       currency: false },
    { key: 'closedLost',      label: 'Deals Lost',      currency: false },
    { key: 'winRate',         label: 'Win Rate',        currency: false, suffix: '%' },
    { key: 'totalRevenue',    label: 'Revenue',         currency: true },
    { key: 'pipelineValue',   label: 'Pipeline Value',  currency: true },
    { key: 'totalCommission', label: 'Commission',      currency: true },
    { key: 'avgDealSize',     label: 'Avg Deal Size',   currency: true },
  ];

  // ── Date helpers ──
  const iso = d => d.toISOString().slice(0, 10);

  const buildPresets = () => {
    const now = new Date();
    const today = iso(now);

    // Day
    const yd = new Date(now); yd.setDate(yd.getDate() - 1);
    const yesterday = iso(yd);

    // Week (Mon-based)
    const dow = (now.getDay() + 6) % 7; // 0=Mon
    const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - dow);
    const lastWeekStart = new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd   = new Date(thisWeekStart); lastWeekEnd.setDate(thisWeekStart.getDate() - 1);

    // Month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);

    // Quarter
    const q = Math.floor(now.getMonth() / 3);
    const thisQStart = new Date(now.getFullYear(), q * 3, 1);
    const lastQStart = new Date(now.getFullYear(), q * 3 - 3, 1);
    const lastQEnd   = new Date(now.getFullYear(), q * 3, 0);

    // Year
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd   = new Date(now.getFullYear() - 1, 11, 31);

    return [
      {
        key: 'day',
        label: 'Day',
        sublabel: 'Today vs Yesterday',
        a: { from: today,               to: today },
        b: { from: yesterday,           to: yesterday },
        labelA: 'Today', labelB: 'Yesterday',
      },
      {
        key: 'week',
        label: 'Week',
        sublabel: 'This week vs Last week',
        a: { from: iso(thisWeekStart),  to: today },
        b: { from: iso(lastWeekStart),  to: iso(lastWeekEnd) },
        labelA: 'This Week', labelB: 'Last Week',
      },
      {
        key: 'month',
        label: 'Month',
        sublabel: 'This month vs Last month',
        a: { from: iso(thisMonthStart), to: today },
        b: { from: iso(lastMonthStart), to: iso(lastMonthEnd) },
        labelA: 'This Month', labelB: 'Last Month',
      },
      {
        key: 'quarter',
        label: 'Quarter',
        sublabel: `Q${q + 1} vs Q${q === 0 ? 4 : q}`,
        a: { from: iso(thisQStart),     to: today },
        b: { from: iso(lastQStart),     to: iso(lastQEnd) },
        labelA: `Q${q + 1} ${now.getFullYear()}`, labelB: `Q${q === 0 ? 4 : q} ${q === 0 ? now.getFullYear() - 1 : now.getFullYear()}`,
      },
      {
        key: 'year',
        label: 'Year',
        sublabel: `${now.getFullYear()} vs ${now.getFullYear() - 1}`,
        a: { from: iso(thisYearStart),  to: today },
        b: { from: iso(lastYearStart),  to: iso(lastYearEnd) },
        labelA: `${now.getFullYear()}`, labelB: `${now.getFullYear() - 1}`,
      },
    ];
  };

  const handlePreset = (preset) => {
    setActivePreset(preset.key);
    setCompA(preset.a);
    setCompB(preset.b);
    runComparison(preset.a, preset.b);
  };

  const PRESETS = buildPresets();

  return (
    <div className="card">
      {/* Header toggle */}
      <button
        onClick={() => setShowCompare(s => !s)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <HiOutlineSwitchHorizontal className="w-5 h-5 text-primary-600" />
          <span className="font-semibold text-gray-800">Compare Periods</span>
          {activePreset && !showCompare && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
              {PRESETS.find(p => p.key === activePreset)?.label}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{showCompare ? 'Hide ▲' : 'Show ▼'}</span>
      </button>

      {showCompare && (
        <div className="mt-4 space-y-4">

          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setMode('presets')}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${
                mode === 'presets' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Quick Presets
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-all ${
                mode === 'custom' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              Custom Dates
            </button>
          </div>

          {/* ── Quick Presets ── */}
          {mode === 'presets' && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESETS.map(preset => (
                <button
                  key={preset.key}
                  onClick={() => handlePreset(preset)}
                  disabled={compareLoading}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                    activePreset === preset.key
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 text-gray-600'
                  }`}
                >
                  <span className="text-base font-bold">
                    {preset.key === 'day'     ? '📅' :
                     preset.key === 'week'    ? '📆' :
                     preset.key === 'month'   ? '🗓️' :
                     preset.key === 'quarter' ? '📊' : '📈'}
                  </span>
                  <span className="text-sm font-semibold mt-1">{preset.label}</span>
                  <span className="text-[10px] text-center text-gray-400 mt-0.5 leading-tight">{preset.sublabel}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Custom Dates ── */}
          {mode === 'custom' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Period A (Current)</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-8">From</label>
                      <input type="date" value={compA.from} onChange={e => setCompA(p => ({...p, from: e.target.value}))} className="input-field text-sm py-1.5 flex-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-8">To</label>
                      <input type="date" value={compA.to} onChange={e => setCompA(p => ({...p, to: e.target.value}))} className="input-field text-sm py-1.5 flex-1" />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Period B (Compare to)</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-8">From</label>
                      <input type="date" value={compB.from} onChange={e => setCompB(p => ({...p, from: e.target.value}))} className="input-field text-sm py-1.5 flex-1" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-8">To</label>
                      <input type="date" value={compB.to} onChange={e => setCompB(p => ({...p, to: e.target.value}))} className="input-field text-sm py-1.5 flex-1" />
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setActivePreset(null); runComparison(); }}
                disabled={compareLoading}
                className="btn-primary text-sm"
              >
                {compareLoading ? 'Comparing…' : '📊 Run Comparison'}
              </button>
            </div>
          )}

          {/* ── Loading ── */}
          {compareLoading && (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              <svg className="animate-spin w-5 h-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Running comparison…
            </div>
          )}

          {!compareLoading && compareData && (() => {
            const labelA = compareData.labels?.A || 'Period A';
            const labelB = compareData.labels?.B || 'Period B';
            const pA = compareData.periodA || {};
            const pB = compareData.periodB || {};

            // Chart data sets
            const countData = [
              { metric: 'New Leads', [labelA]: pA.newLeads  || 0, [labelB]: pB.newLeads  || 0 },
              { metric: 'Deals Won', [labelA]: pA.closedWon || 0, [labelB]: pB.closedWon || 0 },
              { metric: 'Deals Lost',[labelA]: pA.closedLost|| 0, [labelB]: pB.closedLost|| 0 },
              { metric: 'Win Rate',  [labelA]: pA.winRate   || 0, [labelB]: pB.winRate   || 0 },
            ];
            const revenueData = [
              { metric: 'Revenue',   [labelA]: Math.round(pA.totalRevenue    || 0), [labelB]: Math.round(pB.totalRevenue    || 0) },
              { metric: 'Pipeline',  [labelA]: Math.round(pA.pipelineValue   || 0), [labelB]: Math.round(pB.pipelineValue   || 0) },
              { metric: 'Commission',[labelA]: Math.round(pA.totalCommission || 0), [labelB]: Math.round(pB.totalCommission || 0) },
              { metric: 'Avg Deal',  [labelA]: Math.round(pA.avgDealSize     || 0), [labelB]: Math.round(pB.avgDealSize     || 0) },
            ];
            // Radar data
            const maxRev = Math.max(pA.totalRevenue||1, pB.totalRevenue||1);
            const maxPip = Math.max(pA.pipelineValue||1, pB.pipelineValue||1);
            const maxNew = Math.max(pA.newLeads||1, pB.newLeads||1);
            const maxWon = Math.max(pA.closedWon||1, pB.closedWon||1);
            const radarData = [
              { subject: 'Revenue',    [labelA]: Math.round((pA.totalRevenue||0)/maxRev*100),  [labelB]: Math.round((pB.totalRevenue||0)/maxRev*100) },
              { subject: 'Pipeline',   [labelA]: Math.round((pA.pipelineValue||0)/maxPip*100), [labelB]: Math.round((pB.pipelineValue||0)/maxPip*100) },
              { subject: 'New Leads',  [labelA]: Math.round((pA.newLeads||0)/maxNew*100),      [labelB]: Math.round((pB.newLeads||0)/maxNew*100) },
              { subject: 'Deals Won',  [labelA]: Math.round((pA.closedWon||0)/maxWon*100),     [labelB]: Math.round((pB.closedWon||0)/maxWon*100) },
              { subject: 'Win Rate',   [labelA]: Math.round(pA.winRate||0),                    [labelB]: Math.round(pB.winRate||0) },
            ];

            const fmtK = v => v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`;

            return (
              <div className="space-y-6">
                {/* Period legend */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>
                    <span className="font-semibold text-blue-700">{labelA}</span>
                    <span className="text-gray-400">({compA.from} → {compA.to})</span>
                  </span>
                  <span className="text-gray-300">vs</span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-gray-400 inline-block"></span>
                    <span className="font-semibold text-gray-600">{labelB}</span>
                    <span className="text-gray-400">({compB.from} → {compB.to})</span>
                  </span>
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {/* Chart 1: Activity counts */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Activity (Counts)</p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={countData} barGap={2} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey={labelA} fill="#3B82F6" radius={[3,3,0,0]} />
                          <Bar dataKey={labelB} fill="#9CA3AF" radius={[3,3,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Revenue metrics */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Revenue Metrics (USD)</p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={revenueData} barGap={2} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="metric" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, '']} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey={labelA} fill="#10B981" radius={[3,3,0,0]} />
                          <Bar dataKey={labelB} fill="#6EE7B7" radius={[3,3,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 3: Radar overview */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Overall Shape (% of max)</p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                          <Radar name={labelA} dataKey={labelA} stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                          <Radar name={labelB} dataKey={labelB} stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.2} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase border-b">
                        <th className="py-2 pr-4">Metric</th>
                        <th className="py-2 pr-4 text-blue-700">{labelA}</th>
                        <th className="py-2 pr-4 text-gray-500">{labelB}</th>
                        <th className="py-2">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {METRICS.map(m => {
                        const a   = pA[m.key] ?? 0;
                        const b   = pB[m.key] ?? 0;
                        const chg = compareData.changes?.[m.key];
                        const up  = chg !== null && chg > 0;
                        const dn  = chg !== null && chg < 0;
                        const bad_if_up = m.key === 'closedLost';
                        const good = bad_if_up ? dn : up;
                        const bad  = bad_if_up ? up : dn;
                        return (
                          <tr key={m.key} className="hover:bg-gray-50">
                            <td className="py-2.5 pr-4 font-medium text-gray-700">{m.label}</td>
                            <td className="py-2.5 pr-4 font-bold text-blue-700">
                              {m.currency ? fmt(a) : `${a}${m.suffix || ''}`}
                            </td>
                            <td className="py-2.5 pr-4 text-gray-500">
                              {m.currency ? fmt(b) : `${b}${m.suffix || ''}`}
                            </td>
                            <td className="py-2.5">
                              {chg === null || chg === undefined
                                ? <span className="text-gray-400 text-xs">N/A</span>
                                : (
                                  <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                    good ? 'bg-green-100 text-green-700' :
                                    bad  ? 'bg-red-100 text-red-700'   :
                                    'bg-gray-100 text-gray-500'
                                  }`}>
                                    {chg > 0 ? '↑' : chg < 0 ? '↓' : '–'}{Math.abs(chg)}%
                                  </span>
                                )
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
