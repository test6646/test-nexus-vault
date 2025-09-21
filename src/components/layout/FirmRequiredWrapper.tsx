
import { ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import NoFirmSelected from '@/components/layout/NoFirmSelected';

interface FirmRequiredWrapperProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const FirmRequiredWrapper = ({ 
  children, 
  title = "No Firm Selected",
  description = "Please select a firm from the dropdown in the navbar to access this feature, or create a new firm to get started."
}: FirmRequiredWrapperProps) => {
  const { profile, loading, currentFirmId, firmsLoading } = useAuth();

  // Don't show anything while auth is still loading or firms are loading
  if (loading || firmsLoading) {
    return null;
  }

  // Don't show anything if profile is not loaded yet
  if (!profile) {
    return null;
  }

  if (!currentFirmId) {
    return <NoFirmSelected title={title} description={description} />;
  }

  return <>{children}</>;
};

export default FirmRequiredWrapper;
