
import { useAuth } from '@/components/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import TopNavbar from '@/components/layout/TopNavbar';
import StaffDashboard from '@/components/dashboard/StaffDashboard';
import { PageSkeleton } from '@/components/ui/skeleton';

const Dashboard = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Redirect admin users to events page
    if (profile?.role === 'Admin') {
      navigate('/events');
    }
  }, [profile, navigate]);

  if (loading) {
    return (
      <TopNavbar>
        <PageSkeleton />
      </TopNavbar>
    );
  }

  return (
    <TopNavbar>
      <StaffDashboard />
    </TopNavbar>
  );
};

export default Dashboard;
