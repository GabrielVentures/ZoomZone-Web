/**
 * ShelfTagSnap Web Admin
 * Main Application Entry Point
 */

import { Refine } from '@refinedev/core';
import {
  ErrorComponent,
  ThemedLayoutV2,
  ThemedSiderV2,
  useNotificationProvider,
} from '@refinedev/antd';
import routerBindings, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from '@refinedev/react-router-v6';
import { App as AntdApp, ConfigProvider } from 'antd';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';

// Ant Design styles
import '@refinedev/antd/dist/reset.css';

// Custom responsive styles
import './App.css';

// Providers
import { firestoreDataProvider } from './providers/firestoreDataProvider';
import { authProvider } from './providers/authProvider';

// Pages
import { LoginPage } from './pages/login';
import { DashboardPage } from './pages/dashboard';
import { ScanRecordList } from './pages/scan-records/list';
import { ScanRecordShow } from './pages/scan-records/show';
import { UserCostsPage } from './pages/user-costs';
import { BudgetManagementPage } from './pages/budget';
import { AuditLogsPage } from './pages/audit-logs';
import { UnauthorizedPage } from './pages/unauthorized';

// Error Boundary
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Network Status
import { OfflineIndicator } from './components/OfflineIndicator';

// Date Range Context
import { DateRangeProvider } from './contexts/DateRangeContext';

// RBAC Component
import { RequireRole } from './components/auth/RequireRole';

// Session Timeout
import { SessionTimeoutWarning } from './components/SessionTimeoutWarning';

/**
 * Main App Component
 */
function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <DateRangeProvider>
          <OfflineIndicator />
          <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#1890ff',
              borderRadius: 6,
            },
          }}
        >
          <AntdApp>
          <Refine
              dataProvider={firestoreDataProvider}
              authProvider={authProvider}
              routerProvider={routerBindings}
              notificationProvider={useNotificationProvider}
              resources={[
                {
                  name: 'dashboard',
                  list: '/',
                  meta: {
                    label: 'Dashboard',
                    icon: '📊',
                  },
                },
                {
                  name: 'scan_records',
                  list: '/scan-records',
                  show: '/scan-records/show/:id',
                  meta: {
                    label: 'Scan Records',
                    icon: '📸',
                  },
                },
                {
                  name: 'user_cost_stats',
                  list: '/user-costs',
                  meta: {
                    label: 'User Costs',
                    icon: '💰',
                  },
                },
                {
                  name: 'budget',
                  list: '/budget',
                  meta: {
                    label: 'Budget Management',
                    icon: '💳',
                  },
                },
                {
                  name: 'audit_logs',
                  list: '/audit-logs',
                  meta: {
                    label: 'Audit Logs',
                    icon: '📋',
                  },
                },
              ]}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                projectId: 'shelftag-snap-web',
                title: {
                  text: 'ShelfTagSnap Admin',
                  icon: '🏷️',
                },
              }}
            >
              <Routes>
                {/* Login Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Unauthorized Route */}
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Authenticated Routes */}
                <Route
                  element={
                    <ThemedLayoutV2
                      Sider={() => <ThemedSiderV2 Title={() => <div>🏷️ ShelfTagSnap</div>} />}
                    >
                      <Outlet />
                    </ThemedLayoutV2>
                  }
                >
                  {/* Dashboard - Accessible by all authenticated users */}
                  <Route index element={<DashboardPage />} />

                  {/* Scan Records - Admin only */}
                  <Route path="/scan-records">
                    <Route
                      index
                      element={
                        <RequireRole roles={['admin']}>
                          <ScanRecordList />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="show/:id"
                      element={
                        <RequireRole roles={['admin']}>
                          <ScanRecordShow />
                        </RequireRole>
                      }
                    />
                  </Route>

                  {/* User Costs - Admin only */}
                  <Route
                    path="/user-costs"
                    element={
                      <RequireRole roles={['admin']}>
                        <UserCostsPage />
                      </RequireRole>
                    }
                  />

                  {/* Budget Management - Admin only */}
                  <Route
                    path="/budget"
                    element={
                      <RequireRole roles={['admin']}>
                        <BudgetManagementPage />
                      </RequireRole>
                    }
                  />

                  {/* Audit Logs - Admin only */}
                  <Route
                    path="/audit-logs"
                    element={
                      <RequireRole roles={['admin']}>
                        <AuditLogsPage />
                      </RequireRole>
                    }
                  />

                  {/* Catch-all */}
                  <Route path="*" element={<ErrorComponent />} />
                </Route>
              </Routes>

              {/* Session Timeout Warning - Must be inside Refine for QueryClient access */}
              <SessionTimeoutWarning />
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
          </AntdApp>
        </ConfigProvider>
      </DateRangeProvider>
    </ErrorBoundary>
  </BrowserRouter>
  );
}

export default App;
