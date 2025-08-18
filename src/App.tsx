import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/auth/AuthProvider';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AccessPinWrapper from '@/components/auth/AccessPinWrapper';
import { Toaster } from '@/components/ui/toaster';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { CentralizedErrorHandler } from '@/lib/centralized-error-handler';
import Index from './pages/Index';
import SimpleAuth from './pages/SimpleAuth';
import Tasks from './pages/Tasks';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Events from './pages/Events';
import EventsAndPayments from './pages/EventsAndPayments';
import Expenses from './pages/Expenses';
import Finance from './pages/Finance';
import Salary from './pages/Salary';
import Freelancers from './pages/Freelancers';
import Quotations from './pages/Quotations';
import EventSheet from './pages/EventSheet';
import Profile from './pages/Profile';
import WhatsApp from './pages/WhatsApp';
import AuthCallback from './pages/AuthCallback';

import NotFound from './pages/NotFound';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

function App() {
  // Initialize global error handling
  React.useEffect(() => {
    CentralizedErrorHandler.setupGlobalErrorHandling();
  }, []);

  return (
    <ErrorBoundary context="App">
      <QueryClientProvider client={queryClient}>
        <Router>
          <ErrorBoundary context="AccessPin">
            <AccessPinWrapper>
              <ErrorBoundary context="Auth">
                <AuthProvider>
                  <Routes>
                    {/* Public routes - no access pin required */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<SimpleAuth />} />
                    <Route path="/auth-callback" element={<AuthCallback />} />
                    
                    
                    {/* Protected routes */}
                    <Route path="/tasks" element={
                      <ProtectedRoute>
                        <Tasks />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/clients" element={
                      <ProtectedRoute>
                        <Clients />
                      </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    
                    {/* Admin-only protected routes */}
                    <Route path="/events" element={
                      <ProtectedRoute adminOnly>
                        <Events />
                      </ProtectedRoute>
                    } />
                    <Route path="/payments" element={
                      <ProtectedRoute adminOnly>
                        <EventsAndPayments />
                      </ProtectedRoute>
                    } />
                    <Route path="/expenses" element={
                      <ProtectedRoute adminOnly>
                        <Expenses />
                      </ProtectedRoute>
                    } />
                    <Route path="/finance" element={
                      <ProtectedRoute adminOnly>
                        <Finance />
                      </ProtectedRoute>
                    } />
                    <Route path="/salary" element={
                      <ProtectedRoute adminOnly>
                        <Salary />
                      </ProtectedRoute>
                    } />
                    <Route path="/freelancers" element={
                      <ProtectedRoute adminOnly>
                        <Freelancers />
                      </ProtectedRoute>
                    } />
                    <Route path="/quotations" element={
                      <ProtectedRoute adminOnly>
                        <Quotations />
                      </ProtectedRoute>
                    } />
                    <Route path="/overview" element={
                      <ProtectedRoute adminOnly>
                        <EventSheet />
                      </ProtectedRoute>
                    } />
                    <Route path="/whatsapp" element={
                      <ProtectedRoute adminOnly>
                        <WhatsApp />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Toaster />
                </AuthProvider>
              </ErrorBoundary>
            </AccessPinWrapper>
          </ErrorBoundary>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;