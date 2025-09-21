
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Index = () => {
  const { user, authReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only navigate when auth state is definitively ready
    if (!authReady) return;
    
    // Don't redirect if we're on a public auth route
    const currentPath = window.location.pathname;
    if (currentPath === '/auth' || currentPath === '/auth-callback') {
      return;
    }
    
    // Navigate immediately without batching
    if (user) {
      navigate('/tasks', { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  }, [user, authReady, navigate]);

  // Show loading until auth is ready
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse rounded-full h-16 w-16 bg-primary/20 mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
