import { useState, useEffect } from 'react';
import AccessPinVerification from './AccessPinVerification';

interface AccessPinWrapperProps {
  children: React.ReactNode;
}

const ACCESS_PIN_SESSION_KEY = 'studio_access_verified';

const AccessPinWrapper = ({ children }: AccessPinWrapperProps) => {
  const [accessVerified, setAccessVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if access PIN is already verified in session
    const isVerified = sessionStorage.getItem(ACCESS_PIN_SESSION_KEY);
    if (isVerified === 'true') {
      setAccessVerified(true);
    }
    setLoading(false);
  }, []);

  const handleAccessVerified = () => {
    setAccessVerified(true);
  };

  // Show loading while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse rounded-full h-16 w-16 bg-primary/20 mx-auto"></div>
          <p className="text-muted-foreground animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access PIN verification if not verified
  if (!accessVerified) {
    return <AccessPinVerification onVerified={handleAccessVerified} />;
  }

  // Render children if access is verified
  return <>{children}</>;
};

export default AccessPinWrapper;