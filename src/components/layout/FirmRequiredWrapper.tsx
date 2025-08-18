
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
  const { profile, loading, currentFirmId } = useAuth();

  console.log('🔍 FirmRequiredWrapper Debug:', {
    loading,
    profile: profile ? { id: profile.id, role: profile.role } : null,
    currentFirmId,
    hasProfile: !!profile,
    hasCurrentFirmId: !!currentFirmId
  });

  // Don't show anything while loading to prevent flash
  if (loading || !profile) {
    console.log('⏳ FirmRequiredWrapper: Loading or no profile');
    return null;
  }

  if (!currentFirmId) {
    console.log('❌ FirmRequiredWrapper: No current firm ID, showing NoFirmSelected');
    return <NoFirmSelected title={title} description={description} />;
  }

  console.log('✅ FirmRequiredWrapper: All checks passed, rendering children');
  return <>{children}</>;
};

export default FirmRequiredWrapper;
