
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
  const { profile, loading } = useAuth();

  // Don't show anything while loading to prevent flash
  if (loading || !profile) {
    return null;
  }

  if (!profile?.current_firm_id) {
    return <NoFirmSelected title={title} description={description} />;
  }

  return <>{children}</>;
};

export default FirmRequiredWrapper;
