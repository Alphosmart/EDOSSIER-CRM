import { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { leadService } from '../services/leadService';
import { formatNaira } from '../utils/formatCurrency';
import KPICard from '../components/dashboard/KPICard';
import PipelineChart from '../components/dashboard/PipelineChart';
import RevenueChart from '../components/dashboard/RevenueChart';
import TerritoryChart from '../components/dashboard/TerritoryChart';
import OverdueAlerts from '../components/dashboard/OverdueAlerts';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  HiOutlineCurrencyDollar, HiOutlineTrendingUp, HiOutlineUserGroup,
  HiOutlineChartBar, HiOutlineCheckCircle, HiOutlineExclamation,
  HiOutlineCalendar, HiOutlineLightningBolt
} from 'react-icons/hi';

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [territory, setTerritory] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [today, setToday] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [kpiRes, pipeRes, revRes, terRes, overdueRes, todayRes] = await Promise.all([
        dashboardService.getKPIs(),
        dashboardService.getPipeline(),
        dashboardService.getRevenue(),
        dashboardService.getTerritory(),
        leadService.getOverdue(),
        leadService.getToday()
      ]);
      setKpis(kpiRes.data);
      setPipeline(pipeRes.data);
      setRevenue(revRes.data);
      setTerritory(terRes.data);
      setOverdue(overdueRes.data);
      setToday(todayRes.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Dashboard</h1>
        <button onClick={loadDashboard} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Pipeline Leads"
          value={kpis?.totalLeadsInPipeline || 0}
          subtitle={`Value: ${formatNaira(kpis?.activePipelineValue)}`}
          icon={HiOutlineUserGroup}
          color="primary"
        />
        <KPICard
          title="Total Revenue"
          value={formatNaira(kpis?.totalClosedRevenue)}
          subtitle={`${kpis?.totalClosedWon || 0} deals closed`}
          icon={HiOutlineCurrencyDollar}
          color="green"
        />
        <KPICard
          title="Win Rate"
          value={`${kpis?.winRate || 0}%`}
          subtitle={`${kpis?.totalClosedWon || 0}W / ${kpis?.totalClosedLost || 0}L`}
          icon={HiOutlineCheckCircle}
          color="purple"
        />
        <KPICard
          title="Weighted Forecast"
          value={formatNaira(kpis?.weightedForecast)}
          subtitle="Active pipeline weighted"
          icon={HiOutlineTrendingUp}
          color="indigo"
        />
      </div>

      {/* Second row KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Commission Earned"
          value={formatNaira(kpis?.totalCommissionEarned)}
          icon={HiOutlineLightningBolt}
          color="yellow"
        />
        <KPICard
          title="Avg Deal Size"
          value={formatNaira(kpis?.averageDealSize)}
          icon={HiOutlineChartBar}
          color="pink"
        />
        <KPICard
          title="Overdue Follow-ups"
          value={kpis?.overdueFollowUps || 0}
          icon={HiOutlineExclamation}
          color={kpis?.overdueFollowUps > 0 ? 'red' : 'green'}
        />
        <KPICard
          title="Due Today"
          value={kpis?.followUpsDueToday || 0}
          icon={HiOutlineCalendar}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PipelineChart data={pipeline} />
        <OverdueAlerts overdue={overdue} today={today} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenue} />
        <TerritoryChart data={territory} />
      </div>
    </div>
  );
}
