
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false }: ProtectedRouteProps) => {
  const { user, profile, loading, isTransitioning } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || isTransitioning) return;
    
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }

    if (adminOnly && profile?.role !== 'Admin') {
      navigate('/tasks', { replace: true });
      return;
    }
  }, [user, profile, loading, isTransitioning, navigate, adminOnly]);

  // Show loading only briefly
  if (loading || isTransitioning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse rounded-full h-16 w-16 bg-primary/20 mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if redirecting
  if (!user) return null;
  if (adminOnly && profile?.role !== 'Admin') return null;

  return <>{children}</>;
};

export default ProtectedRoute;
