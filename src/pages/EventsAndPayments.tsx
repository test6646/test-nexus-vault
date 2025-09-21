import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import PaymentManagement from '@/components/payments/PaymentManagement';
import FirmRequiredWrapper from '@/components/layout/FirmRequiredWrapper';
import { PageSkeleton } from '@/components/ui/skeleton';

const EventsAndPayments = () => {
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
      <FirmRequiredWrapper 
        title="No Firm Selected"
        description="Please select a firm from the dropdown in the navbar to manage events and payments, or create a new firm to get started."
      >
        <PaymentManagement />
      </FirmRequiredWrapper>
    </TopNavbar>
  );
};

export default EventsAndPayments;