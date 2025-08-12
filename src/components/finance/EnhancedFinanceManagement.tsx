import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useEnhancedFinanceStats } from './hooks/useEnhancedFinanceStats';
import FinanceHeader from './FinanceHeader';
import FinanceStats from './FinanceStats';
import RedesignedFinanceCharts from './RedesignedFinanceCharts';
import { BarChart3 } from 'lucide-react';

const EnhancedFinanceManagement = () => {
  const { currentFirmId } = useAuth();
  const [timeRange, setTimeRange] = useState('global');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const { stats, loading } = useEnhancedFinanceStats(
    timeRange, 
    customStartDate?.toISOString().split('T')[0], 
    customEndDate?.toISOString().split('T')[0]
  );

  const handleCustomDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    if (startDate && endDate) {
      setTimeRange('custom');
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!currentFirmId) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Financial Management
          </h1>
          <p className="text-muted-foreground">
            Monitor your business performance with comprehensive financial analytics and insights.
          </p>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No Firm Selected"
          description="Please select a firm to view financial data."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Financial Management
        </h1>
        <p className="text-muted-foreground">
          Monitor your business performance with comprehensive financial analytics and insights.
        </p>
      </div>

      <FinanceHeader
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        stats={stats}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateRangeChange={handleCustomDateRangeChange}
      />

      {stats && (
        <>
          <FinanceStats 
            stats={stats} 
            timeRange={timeRange}
            customStartDate={customStartDate?.toISOString().split('T')[0]}
            customEndDate={customEndDate?.toISOString().split('T')[0]}
          />
          <RedesignedFinanceCharts 
            stats={stats} 
            timeRange={timeRange}
            customStartDate={customStartDate?.toISOString().split('T')[0]}
            customEndDate={customEndDate?.toISOString().split('T')[0]}
          />
        </>
      )}
    </div>
  );
};

export default EnhancedFinanceManagement;