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
import GeographyChart from '../components/dashboard/GeographyChart';
import OverdueAlerts from '../components/dashboard/OverdueAlerts';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  HiOutlineCurrencyDollar, HiOutlineTrendingUp, HiOutlineUserGroup,
  HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineExclamation,
  HiOutlineCalendar, HiOutlineLightningBolt, HiOutlineClipboardList,
  HiOutlineOfficeBuilding, HiOutlineCog, HiOutlineArrowRight, HiOutlineUsers,
  HiOutlineSwitchHorizontal, HiOutlineGlobe, HiOutlineLocationMarker
} from 'react-icons/hi';

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const isAdminOrManager = hasRole('admin', 'manager', 'bursar');

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

  // ── Geographic filter state ──────────────────────────────────────────────
  const [geoCountry, setGeoCountry] = useState('');
  const [geoState,   setGeoState]   = useState('');
  const [geoLga,     setGeoLga]     = useState('');
  const [geoOptions, setGeoOptions] = useState({ countries: [], states: [], lgas: [] });

  // Geographic breakdown panel
  const [geoBreakdown,        setGeoBreakdown]        = useState([]);
  const [geoLevel,             setGeoLevel]             = useState('state'); // 'country'|'state'|'lga'
  const [geoBreakdownLoading,  setGeoBreakdownLoading]  = useState(false);
  const [showGeoBreakdown,     setShowGeoBreakdown]     = useState(true);

  // Load available countries (and states/LGAs) for the cascading dropdowns
  useEffect(() => {
    dashboardService.getGeoOptions()
      .then(({ data }) => setGeoOptions(prev => ({ ...prev, countries: data.countries, states: data.states })))
      .catch(() => {});
  }, []);

  // When country changes: reload states and clear deeper selections
  useEffect(() => {
    setGeoState('');
    setGeoLga('');
    if (!geoCountry) {
      dashboardService.getGeoOptions()
        .then(({ data }) => setGeoOptions(prev => ({ ...prev, states: data.states, lgas: [] })))
        .catch(() => {});
      return;
    }
    dashboardService.getGeoOptions(geoCountry)
      .then(({ data }) => setGeoOptions(prev => ({ ...prev, states: data.states, lgas: [] })))
      .catch(() => {});
  }, [geoCountry]);

  // When state changes: reload LGAs and clear LGA selection
  useEffect(() => {
    setGeoLga('');
    if (!geoState) { setGeoOptions(prev => ({ ...prev, lgas: [] })); return; }
    dashboardService.getGeoOptions(geoCountry, geoState)
      .then(({ data }) => setGeoOptions(prev => ({ ...prev, lgas: data.lgas })))
      .catch(() => {});
  }, [geoState]);

  // Load geo breakdown whenever filters or level changes
  const loadGeoBreakdown = async (opts = {}) => {
    setGeoBreakdownLoading(true);
    try {
      const { data } = await dashboardService.getGeoBreakdown({
        from: opts.from || dateFrom,
        to:   opts.to   || dateTo,
        country: opts.country !== undefined ? opts.country : geoCountry,
        state:   opts.state   !== undefined ? opts.state   : geoState,
        lga:     opts.lga     !== undefined ? opts.lga     : geoLga,
        level:   opts.level   || geoLevel
      });
      setGeoBreakdown(data);
    } catch (e) {}
    setGeoBreakdownLoading(false);
  };

  useEffect(() => {
    if (showGeoBreakdown) loadGeoBreakdown();
  }, [geoLevel, showGeoBreakdown, geoCountry, geoState, geoLga]);
  // ── End geographic filter state ──────────────────────────────────────────

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

  const loadDashboard = async (from = dateFrom, to = dateTo, geoOpts = {}) => {
    const country = geoOpts.country !== undefined ? geoOpts.country : geoCountry;
    const state   = geoOpts.state   !== undefined ? geoOpts.state   : geoState;
    const lga     = geoOpts.lga     !== undefined ? geoOpts.lga     : geoLga;
    setLoading(true);
    try {
      const opts = { from, to, country, state, lga };
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

  const handleApplyFilter = () => {
    loadDashboard(dateFrom, dateTo);
    loadGeoBreakdown({ from: dateFrom, to: dateTo });
  };

  const handleResetFilter = () => {
    const from = getDefaultFrom();
    const to = new Date().toISOString().slice(0, 10);
    setDateFrom(from);
    setDateTo(to);
    setGeoCountry(''); setGeoState(''); setGeoLga('');
    loadDashboard(from, to, { country: '', state: '', lga: '' });
    loadGeoBreakdown({ from, to, country: '', state: '', lga: '' });
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

          {/* Geographic drill-down filters */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <HiOutlineGlobe className="w-4 h-4 text-gray-400 shrink-0" />
            {/* Country */}
            <select
              value={geoCountry}
              onChange={e => { setGeoCountry(e.target.value); setGeoState(''); setGeoLga(''); }}
              className="input-field py-1.5 text-sm w-44"
            >
              <option value="">All Countries</option>
              {geoOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* State / Territory */}
            <select
              value={geoState}
              onChange={e => { setGeoState(e.target.value); setGeoLga(''); }}
              className="input-field py-1.5 text-sm w-44"
              disabled={!geoOptions.states.length}
            >
              <option value="">All States</option>
              {geoOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* LGA / City */}
            {geoOptions.lgas.length > 0 && (
              <select
                value={geoLga}
                onChange={e => setGeoLga(e.target.value)}
                className="input-field py-1.5 text-sm w-44"
              >
                <option value="">All LGAs</option>
                {geoOptions.lgas.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            )}

            {(geoCountry || geoState || geoLga) && (
              <button
                onClick={() => { setGeoCountry(''); setGeoState(''); setGeoLga(''); }}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
              >
                ✕ Clear geo
              </button>
            )}
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
          <TerritoryChart data={territory} fmt={fmt} />
        </div>

        {/* ── Geographic Breakdown ── */}
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <button
              onClick={() => setShowGeoBreakdown(s => !s)}
              className="flex items-center gap-2 font-semibold text-gray-800"
            >
              <HiOutlineLocationMarker className="w-5 h-5 text-primary-600" />
              Geographic Breakdown
              <span className="text-xs text-gray-400">{showGeoBreakdown ? '▲' : '▼'}</span>
            </button>
            {showGeoBreakdown && (
              <div className="flex items-center gap-2">
                {/* Drill-down level selector */}
                {[['country','By Country'],['state','By State'],['lga','By LGA/City']].map(([lv, label]) => (
                  <button
                    key={lv}
                    onClick={() => { setGeoLevel(lv); loadGeoBreakdown({ level: lv }); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      geoLevel === lv
                        ? 'bg-primary-600 text-white border-primary-600 shadow'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => loadGeoBreakdown()}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
          {showGeoBreakdown && (
            <GeographyChart
              data={geoBreakdown}
              level={geoLevel}
              fmt={fmt}
              loading={geoBreakdownLoading}
            />
          )}
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

        {/* Geographic drill-down filters (sales rep / team lead) */}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <HiOutlineGlobe className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={geoCountry}
            onChange={e => { setGeoCountry(e.target.value); setGeoState(''); setGeoLga(''); }}
            className="input-field py-1.5 text-sm w-40"
          >
            <option value="">All Countries</option>
            {geoOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {user?.role === 'team_lead' ? (
            /* team_lead territory is locked server-side — show as read-only pill */
            user?.territory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 border border-primary-200 rounded-md text-xs font-medium">
                <HiOutlineLocationMarker className="w-3.5 h-3.5" />
                Territory: {user.territory}
              </span>
            )
          ) : (
            <select
              value={geoState}
              onChange={e => { setGeoState(e.target.value); setGeoLga(''); }}
              className="input-field py-1.5 text-sm w-40"
              disabled={!geoOptions.states.length}
            >
              <option value="">All States</option>
              {geoOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {geoOptions.lgas.length > 0 && (
            <select
              value={geoLga}
              onChange={e => setGeoLga(e.target.value)}
              className="input-field py-1.5 text-sm w-40"
            >
              <option value="">All LGAs</option>
              {geoOptions.lgas.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          {(geoCountry || geoState || geoLga) && (
            <button
              onClick={() => { setGeoCountry(''); setGeoState(''); setGeoLga(''); }}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >✕ Clear geo</button>
          )}
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
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = `${curYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(curYear, now.getMonth() - 1, 1);
  const prevMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const curQ = Math.floor(now.getMonth() / 3);
  const todayIso = now.toISOString().slice(0, 10);
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  const yesterdayIso = yest.toISOString().slice(0, 10);
  // ISO week string helper
  const toIsoWeek = (d) => {
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
    const year = tmp.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((tmp - startOfYear) / 86400000) + 1) / 7);
    return `${year}-W${String(week).padStart(2, '0')}`;
  };
  const lastWeekDate = new Date(now); lastWeekDate.setDate(lastWeekDate.getDate() - 7);

  const [granularity, setGranularity] = useState('month');
  // Picker values per granularity { day, week, month, quarter:{y,q}, year }
  const [pickA, setPickA] = useState({ day: todayIso,     week: toIsoWeek(now),          month: curMonth,  quarter: { y: curYear,  q: curQ },                         year: curYear });
  const [pickB, setPickB] = useState({ day: yesterdayIso, week: toIsoWeek(lastWeekDate), month: prevMonth, quarter: { y: curQ === 0 ? curYear - 1 : curYear, q: curQ === 0 ? 3 : curQ - 1 }, year: curYear - 1 });

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const iso = d => d.toISOString().slice(0, 10);

  // Convert picker selection → { from, to }
  const toRange = (gran, val) => {
    if (gran === 'day') return { from: val, to: val };
    if (gran === 'week') {
      const [yr, wk] = val.split('-W').map(Number);
      // ISO week Monday
      const jan4 = new Date(yr, 0, 4);
      const mon = new Date(jan4);
      mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (wk - 1) * 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { from: iso(mon), to: iso(sun) };
    }
    if (gran === 'month') {
      const [y, m] = val.split('-').map(Number);
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    }
    if (gran === 'quarter') {
      const { y, q } = val;
      return { from: iso(new Date(y, q * 3, 1)), to: iso(new Date(y, q * 3 + 3, 0)) };
    }
    if (gran === 'year') {
      return { from: iso(new Date(val, 0, 1)), to: iso(new Date(val, 11, 31)) };
    }
  };

  // Human-readable label
  const toLabel = (gran, val) => {
    if (gran === 'day') return val;
    if (gran === 'week') { const [yr, wk] = val.split('-W'); return `Wk ${wk}, ${yr}`; }
    if (gran === 'month') { const [y, m] = val.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; }
    if (gran === 'quarter') return `Q${val.q + 1} ${val.y}`;
    if (gran === 'year') return `${val}`;
  };

  const handleCompare = () => {
    const a = toRange(granularity, pickA[granularity]);
    const b = toRange(granularity, pickB[granularity]);
    setCompA(a); setCompB(b);
    runComparison(a, b);
  };

  const GRAN_TABS = [
    { key: 'day',     label: 'Day',     icon: '📅' },
    { key: 'week',    label: 'Week',    icon: '📆' },
    { key: 'month',   label: 'Month',   icon: '🗓️' },
    { key: 'quarter', label: 'Quarter', icon: '📊' },
    { key: 'year',    label: 'Year',    icon: '📈' },
  ];

  // Picker component per granularity
  const Picker = ({ which }) => {
    const val = which === 'A' ? pickA : pickB;
    const setVal = which === 'A' ? setPickA : setPickB;
    const upd = (key, v) => setVal(p => ({ ...p, [key]: v }));
    const accent = which === 'A' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200';
    const labelColor = which === 'A' ? 'text-blue-700' : 'text-gray-600';

    return (
      <div className={`rounded-xl border p-4 ${accent}`}>
        <p className={`text-xs font-bold uppercase mb-3 ${labelColor}`}>
          {which === 'A' ? 'Period A' : 'Period B'}
          {val[granularity] && (
            <span className={`ml-2 font-normal normal-case text-gray-400`}>
              {toLabel(granularity, val[granularity])}
            </span>
          )}
        </p>

        {granularity === 'day' && (
          <input type="date" value={val.day}
            onChange={e => upd('day', e.target.value)}
            className="input-field text-sm py-1.5 w-full" />
        )}

        {granularity === 'week' && (
          <input type="week" value={val.week}
            onChange={e => upd('week', e.target.value)}
            className="input-field text-sm py-1.5 w-full" />
        )}

        {granularity === 'month' && (
          <input type="month" value={val.month}
            onChange={e => upd('month', e.target.value)}
            className="input-field text-sm py-1.5 w-full" />
        )}

        {granularity === 'quarter' && (
          <div className="space-y-2">
            <input type="number" min="2015" max="2100"
              value={val.quarter.y}
              onChange={e => upd('quarter', { ...val.quarter, y: parseInt(e.target.value) || curYear })}
              className="input-field text-sm py-1.5 w-full" placeholder="Year e.g. 2025" />
            <div className="grid grid-cols-4 gap-1.5">
              {[0,1,2,3].map(q => (
                <button key={q}
                  onClick={() => upd('quarter', { ...val.quarter, q })}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    val.quarter.q === q
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400'
                  }`}>Q{q + 1}</button>
              ))}
            </div>
          </div>
        )}

        {granularity === 'year' && (
          <input type="number" min="2015" max="2100"
            value={val.year}
            onChange={e => upd('year', parseInt(e.target.value) || curYear)}
            className="input-field text-sm py-1.5 w-full" placeholder="e.g. 2025" />
        )}
      </div>
    );
  };

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
          {!showCompare && (
            <span className="text-xs text-gray-400 ml-1">
              {toLabel(granularity, pickA[granularity])} vs {toLabel(granularity, pickB[granularity])}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">{showCompare ? 'Hide ▲' : 'Show ▼'}</span>
      </button>

      {showCompare && (
        <div className="mt-4 space-y-5">

          {/* Granularity selector */}
          <div className="flex flex-wrap gap-2">
            {GRAN_TABS.map(g => (
              <button
                key={g.key}
                onClick={() => setGranularity(g.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  granularity === g.key
                    ? 'bg-primary-600 text-white border-primary-600 shadow'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
                }`}
              >
                <span>{g.icon}</span> {g.label}
              </button>
            ))}
          </div>

          {/* Period pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Picker which="A" />
            <Picker which="B" />
          </div>

          {/* Compare button */}
          <button onClick={handleCompare} disabled={compareLoading} className="btn-primary text-sm">
            {compareLoading ? 'Comparing…' : '📊 Compare'}
          </button>

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
