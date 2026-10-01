import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import DashboardPage from './routes/DashboardPage';
import CustomersPage from './routes/CustomersPage';
import MetricsPage from './routes/MetricsPage';
import DataSourcesPage from './routes/DataSourcesPage';
import AlertsPage from './routes/AlertsPage';
import SettingsPage from './routes/SettingsPage';
import QueryPage from './routes/QueryPage';
import AuditPage from './routes/AuditPage';
import TeamPage from './routes/TeamPage';
import BillingPage from './routes/BillingPage';
import ReportsPage from './routes/ReportsPage';
import DataQualityPage from './routes/DataQualityPage';
import OnboardingPage from './routes/OnboardingPage';
import { Card, EmptyState, Button } from './components/ui';

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="p-6">
      <Card>
        <EmptyState title="Page not found" description="That route doesn't exist. Head back to the dashboard."
          action={<Button variant="primary" size="sm" onClick={() => navigate('/')}>Back to dashboard</Button>} />
      </Card>
    </div>
  );
}

export default function App() {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 30_000 } },
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="query" element={<QueryPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="metrics" element={<MetricsPage />} />
            <Route path="data" element={<DataSourcesPage />} />
            <Route path="data-quality" element={<DataQualityPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route path="404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}