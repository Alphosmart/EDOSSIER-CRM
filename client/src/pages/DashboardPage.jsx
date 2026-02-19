import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/dashboardService';
import { leadService } from '../services/leadService';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
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
  HiOutlineOfficeBuilding, HiOutlineCog, HiOutlineArrowRight, HiOutlineUsers
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
          </div>
        </div>

        {/* Row 1 – Revenue & Deals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Total Revenue" value={formatCurrency(kpis?.totalClosedRevenue, 'USD')} subtitle={`${kpis?.totalClosedWon || 0} deals closed`} icon={HiOutlineCurrencyDollar} color="green" />
          <KPICard title="Pipeline Value" value={formatCurrency(kpis?.activePipelineValue, 'USD')} subtitle={`${kpis?.totalLeadsInPipeline || 0} active leads`} icon={HiOutlineUserGroup} color="primary" />
          <KPICard title="Weighted Forecast" value={formatCurrency(kpis?.weightedForecast, 'USD')} subtitle="Probability-adjusted" icon={HiOutlineTrendingUp} color="indigo" />
          <KPICard title="Avg Deal Size" value={formatCurrency(kpis?.averageDealSize, 'USD')} icon={HiOutlineChartBar} color="pink" />
        </div>

        {/* Row 2 – Performance & Commission */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Win Rate" value={`${kpis?.winRate || 0}%`} subtitle={`${kpis?.totalClosedWon || 0}W / ${kpis?.totalClosedLost || 0}L`} icon={HiOutlineCheckCircle} color="purple" />
          <KPICard title="Total Commission Paid" value={formatCurrency(kpis?.totalCommissionEarned, 'USD')} icon={HiOutlineLightningBolt} color="yellow" />
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
        </div>
      </div>

      {/* Row 1 – Personal KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="My Pipeline" value={kpis?.totalLeadsInPipeline || 0} subtitle={`Value: ${formatCurrency(kpis?.activePipelineValue, 'USD')}`} icon={HiOutlineClipboardList} color="primary" />
        <KPICard title="My Revenue" value={formatCurrency(kpis?.totalClosedRevenue, 'USD')} subtitle={`${kpis?.totalClosedWon || 0} deals closed`} icon={HiOutlineCurrencyDollar} color="green" />
        <KPICard title="My Commission" value={formatCurrency(kpis?.totalCommissionEarned, 'USD')} icon={HiOutlineLightningBolt} color="yellow" />
        <KPICard title="Win Rate" value={`${kpis?.winRate || 0}%`} subtitle={`${kpis?.totalClosedWon || 0}W / ${kpis?.totalClosedLost || 0}L`} icon={HiOutlineCheckCircle} color="purple" />
      </div>

      {/* Row 2 – Action items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Overdue Follow-ups" value={kpis?.overdueFollowUps || 0} icon={HiOutlineExclamation} color={kpis?.overdueFollowUps > 0 ? 'red' : 'green'} />
        <KPICard title="Due Today" value={kpis?.followUpsDueToday || 0} icon={HiOutlineCalendar} color="orange" />
        <KPICard title="Weighted Forecast" value={formatCurrency(kpis?.weightedForecast, 'USD')} subtitle="Probability-adjusted" icon={HiOutlineTrendingUp} color="indigo" />
        <KPICard title="Avg Deal Size" value={formatCurrency(kpis?.averageDealSize, 'USD')} icon={HiOutlineChartBar} color="pink" />
      </div>

      {/* Charts – Pipeline & Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineChart data={pipeline} />
        <OverdueAlerts overdue={overdue} today={today} />
      </div>

      {/* Revenue chart only */}
      <RevenueChart data={revenue} />
    </div>
  );
}
