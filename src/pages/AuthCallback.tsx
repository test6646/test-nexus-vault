import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loading02Icon } from 'hugeicons-react';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');

      console.log('AuthCallback: Processing auth callback', { type, hasAccessToken: !!accessToken });

      // Fallback for all auth types or errors
      console.log('AuthCallback: Processing complete, redirecting to auth');
      navigate('/auth', { replace: true });
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loading02Icon className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;