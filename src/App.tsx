import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/auth/AuthProvider';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

import { SubscriptionBlocker } from '@/components/subscription/SubscriptionBlocker';
import { ExpiredSubscriptionNotice } from '@/components/subscription/ExpiredSubscriptionNotice';
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

import Profile from './pages/Profile';
import WhatsApp from './pages/WhatsApp';
import AuthCallback from './pages/AuthCallback';

import Accounts from './pages/Accounts';
import Subscription from './pages/Subscription';
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
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Tasks />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Dashboard />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/clients" element={
                      <ProtectedRoute>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Clients />
                        </SubscriptionBlocker>
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
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Events />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/payments" element={
                      <ProtectedRoute adminOnly>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <EventsAndPayments />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/expenses" element={
                      <ProtectedRoute adminOnly>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Expenses />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/finance" element={
                      <ProtectedRoute adminOnly>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Finance />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/salary" element={
                      <ProtectedRoute adminOnly>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Salary />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/freelancers" element={
                      <ProtectedRoute adminOnly>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Freelancers />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/quotations" element={
                      <ProtectedRoute adminOnly>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Quotations />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/whatsapp" element={
                      <ProtectedRoute adminOnly>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <WhatsApp />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/accounts" element={
                      <ProtectedRoute adminOnly>
                        <SubscriptionBlocker>
                          <ExpiredSubscriptionNotice />
                          <Accounts />
                        </SubscriptionBlocker>
                      </ProtectedRoute>
                    } />
                    <Route path="/subscription" element={
                      <ProtectedRoute adminOnly>
                        <Subscription />
                      </ProtectedRoute>
                    } />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
              <Toaster />
            </AuthProvider>
          </ErrorBoundary>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;