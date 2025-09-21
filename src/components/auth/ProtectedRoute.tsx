
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, profile, authReady, firmsLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only make routing decisions when auth state is definitively ready
    if (!authReady) return;
    
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (adminOnly && profile?.role !== 'Admin') {
      navigate('/tasks', { replace: true });
      return;
    }
  }, [user, profile, authReady, navigate, adminOnly]);

  // Show loading until auth is ready AND firms are loaded
  if (!authReady || firmsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse rounded-full h-16 w-16 bg-primary/20 mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user should be redirected
  if (!user) return null;
  if (adminOnly && profile?.role !== 'Admin') return null;

  return <>{children}</>;
};

export default ProtectedRoute;
