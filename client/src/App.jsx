import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailPage from './pages/LeadDetailPage';
import AddLeadPage from './pages/AddLeadPage';
import CommissionsPage from './pages/CommissionsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import SubscriptionPage from './pages/SubscriptionPage';
import ForecastPage from './pages/ForecastPage';
import MonthlyPerformancePage from './pages/MonthlyPerformancePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Protected Route wrapper
function ProtectedRoute({ roles }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) return <LoadingSpinner size="lg" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

// Layout with Navbar + Sidebar
function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 ml-0 md:ml-64 mt-16 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/new" element={<AddLeadPage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/commissions" element={<CommissionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Manager / Team Lead / Admin */}
          <Route element={<ProtectedRoute roles={['admin', 'manager', 'team_lead']} />}>
            <Route path="/subscriptions" element={<SubscriptionPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          {/* Admin / Manager only */}
          <Route element={<ProtectedRoute roles={['admin', 'manager']} />}>
            <Route path="/monthly-performance" element={<MonthlyPerformancePage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <AppRoutes />
          <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </AuthProvider>
    </Router>
    </ErrorBoundary>
  );
}
