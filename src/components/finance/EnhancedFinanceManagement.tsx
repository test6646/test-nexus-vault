import { useState } from 'react';
import { PageSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import StatsGrid from '@/components/ui/stats-grid';
import EnhancedFinanceCharts from './EnhancedFinanceCharts';
import FinanceStats from './FinanceStats';
import FinanceHeader from './FinanceHeader';
import { useEnhancedFinanceStats } from './hooks/useEnhancedFinanceStats';
import { EmptyState } from '@/components/ui/empty-state';
import { BarChart3 } from 'lucide-react';

const EnhancedFinanceManagement = () => {
  const { profile } = useAuth();
  const [timeRange, setTimeRange] = useState('month');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  
  const { stats, loading } = useEnhancedFinanceStats(
    timeRange, 
    customStartDate?.toISOString(), 
    customEndDate?.toISOString()
  );

  const handleCustomDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!profile?.current_firm_id) {
    return (
      <div className="space-y-6">
        <FinanceHeader 
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          stats={null}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomDateRangeChange={handleCustomDateRangeChange}
        />
        <EmptyState
          icon={BarChart3}
          title="No Firm Selected"
          description="Please select a firm to view comprehensive financial analytics and insights."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FinanceHeader 
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        stats={stats}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={handleCustomDateRangeChange}
      />

      {/* Stats Cards */}
      {stats && (
        <FinanceStats stats={stats} />
      )}

      {/* Enhanced Charts and Analytics */}
      {stats && (
        <EnhancedFinanceCharts 
          stats={stats} 
          timeRange={timeRange}
          customStartDate={customStartDate?.toISOString()}
          customEndDate={customEndDate?.toISOString()}
        />
      )}
    </div>
  );
};

export default EnhancedFinanceManagement;