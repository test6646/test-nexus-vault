
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import EnhancedFinanceManagement from '@/components/finance/EnhancedFinanceManagement';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';
import { PageSkeleton } from '@/components/ui/skeleton';

const Finance = () => {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    // Only redirect non-admin users AFTER profile has loaded
    if (!loading && user && profile && profile.role !== 'Admin') {
      navigate('/tasks');
    }
  }, [user, loading, profile, navigate]);

  if (loading) {
    return (
      <TopNavbar>
        <PageSkeleton />
      </TopNavbar>
    );
  }

  return (
    <TopNavbar>
      <FirmRequiredWrapper>
        <EnhancedFinanceManagement />
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default Finance;
