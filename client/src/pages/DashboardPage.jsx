import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

  const runComparison = async () => {
    setCompareLoading(true);
    try {
      const { data } = await dashboardService.compareStats(compA.from, compA.to, compB.from, compB.to);
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
  const METRICS = [
    { key: 'newLeads',       label: 'New Leads',         currency: false },
    { key: 'closedWon',     label: 'Deals Won',          currency: false },
    { key: 'closedLost',    label: 'Deals Lost',         currency: false },
    { key: 'winRate',       label: 'Win Rate',           currency: false, suffix: '%' },
    { key: 'totalRevenue',  label: 'Revenue',            currency: true },
    { key: 'pipelineValue', label: 'Pipeline Value',     currency: true },
    { key: 'totalCommission', label: 'Commission',       currency: true },
    { key: 'avgDealSize',   label: 'Avg Deal Size',      currency: true },
  ];

  return (
    <div className="card">
      <button
        onClick={() => setShowCompare(s => !s)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <HiOutlineSwitchHorizontal className="w-5 h-5 text-primary-600" />
          <span className="font-semibold text-gray-800">Compare Periods</span>
        </div>
        <span className="text-xs text-gray-400">{showCompare ? 'Hide ▲' : 'Show ▼'}</span>
      </button>

      {showCompare && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Period A */}
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Period A (Current)</p>
              <div className="flex flex-col gap-2">
                <input type="date" value={compA.from} onChange={e => setCompA(p => ({...p, from: e.target.value}))} className="input-field text-sm py-1.5" />
                <input type="date" value={compA.to} onChange={e => setCompA(p => ({...p, to: e.target.value}))} className="input-field text-sm py-1.5" />
              </div>
            </div>
            {/* Period B */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Period B (Compare to)</p>
              <div className="flex flex-col gap-2">
                <input type="date" value={compB.from} onChange={e => setCompB(p => ({...p, from: e.target.value}))} className="input-field text-sm py-1.5" />
                <input type="date" value={compB.to} onChange={e => setCompB(p => ({...p, to: e.target.value}))} className="input-field text-sm py-1.5" />
              </div>
            </div>
          </div>
          <button onClick={runComparison} disabled={compareLoading} className="btn-primary text-sm">
            {compareLoading ? 'Comparing…' : '📊 Run Comparison'}
          </button>

          {compareData && (
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="py-2 pr-4">Metric</th>
                    <th className="py-2 pr-4 text-blue-700">{compareData.labels?.A || 'Period A'}</th>
                    <th className="py-2 pr-4 text-gray-500">{compareData.labels?.B || 'Period B'}</th>
                    <th className="py-2">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {METRICS.map(m => {
                    const a = compareData.periodA?.[m.key] ?? 0;
                    const b = compareData.periodB?.[m.key] ?? 0;
                    const chg = compareData.changes?.[m.key];
                    const up = chg !== null && chg > 0;
                    const dn = chg !== null && chg < 0;
                    const lostKey = m.key === 'closedLost'; // losing more is bad
                    const good = lostKey ? dn : up;
                    const bad  = lostKey ? up : dn;
                    return (
                      <tr key={m.key} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium text-gray-700">{m.label}</td>
                        <td className="py-2 pr-4 font-bold text-blue-700">{m.currency ? fmt(a) : `${a}${m.suffix || ''}`}</td>
                        <td className="py-2 pr-4 text-gray-500">{m.currency ? fmt(b) : `${b}${m.suffix || ''}`}</td>
                        <td className="py-2">
                          {chg === null ? <span className="text-gray-400 text-xs">N/A</span> : (
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                              good ? 'bg-green-100 text-green-700' :
                              bad  ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {chg > 0 ? '+' : ''}{chg}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
