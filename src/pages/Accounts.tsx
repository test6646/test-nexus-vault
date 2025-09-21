import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';
import { PageSkeleton } from '@/components/ui/skeleton';
import { AccountingManagement } from '@/components/accounting/AccountingManagement';

const Accounts = () => {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
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
      <FirmRequiredWrapper 
        title="No Firm Selected"
        description="Please select a firm from the navbar to manage accounts, or create a new firm to get started."
      >
        <div className="space-y-6">
          <AccountingManagement />
        </div>
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default Accounts;