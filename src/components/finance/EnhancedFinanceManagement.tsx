import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useFinanceStatsWithAccounting } from './hooks/useFinanceStatsWithAccounting';
import FinanceHeader from './FinanceHeader';
import FinanceStats from './FinanceStats';
import RedesignedFinanceCharts from './RedesignedFinanceCharts';

import { useToast } from '@/hooks/use-toast';
import { BarChart3, FileText } from 'lucide-react';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useFinanceExportConfig } from '@/hooks/useFinanceExportConfig';

const EnhancedFinanceManagement = () => {
  const { currentFirmId } = useAuth();
  const [timeRange, setTimeRange] = useState('global');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const financeExportConfig = useFinanceExportConfig([]);

  const { stats, loading } = useFinanceStatsWithAccounting(
    timeRange, 
    customStartDate?.toISOString().split('T')[0], 
    customEndDate?.toISOString().split('T')[0]
  );
  const { toast } = useToast();

  const handleCustomDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    // Always set timeRange to custom when dates are provided, regardless of previous state
    if (startDate && endDate) {
      setTimeRange('custom');
    } else if (!startDate && !endDate) {
      // If both dates are cleared, reset to month view
      setTimeRange('month');
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