import { useState, useEffect } from 'react';
import AccessPinVerification from './AccessPinVerification';

interface AccessPinWrapperProps {
  children: React.ReactNode;
}

const ACCESS_PIN_SESSION_KEY = 'studio_access_verified';
const ACCESS_PIN_LOCAL_KEY = 'studio_access_verified_local';

const AccessPinWrapper = ({ children }: AccessPinWrapperProps) => {
  const [accessVerified, setAccessVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if access PIN is already verified in both session and local storage
    const sessionVerified = sessionStorage.getItem(ACCESS_PIN_SESSION_KEY);
    const localVerified = localStorage.getItem(ACCESS_PIN_LOCAL_KEY);
    
    if (sessionVerified === 'true' && localVerified === 'true') {
      setAccessVerified(true);
    }
    setLoading(false);
  }, []);

  const handleAccessVerified = () => {
    setAccessVerified(true);
    // Store verification in both session and local storage
    sessionStorage.setItem(ACCESS_PIN_SESSION_KEY, 'true');
    localStorage.setItem(ACCESS_PIN_LOCAL_KEY, 'true');
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