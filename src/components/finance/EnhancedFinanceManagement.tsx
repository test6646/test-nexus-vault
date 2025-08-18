import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { useEnhancedFinanceStats } from './hooks/useEnhancedFinanceStats';
import FinanceHeader from './FinanceHeader';
import FinanceStats from './FinanceStats';
import RedesignedFinanceCharts from './RedesignedFinanceCharts';
import generateFinanceReportPDF from './FinanceReportPDF';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, FileText } from 'lucide-react';

const EnhancedFinanceManagement = () => {
  const { currentFirmId } = useAuth();
  const [timeRange, setTimeRange] = useState('global');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { stats, loading } = useEnhancedFinanceStats(
    timeRange, 
    customStartDate?.toISOString().split('T')[0], 
    customEndDate?.toISOString().split('T')[0]
  );
  const { toast } = useToast();

  const handleCustomDateRangeChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
    if (startDate && endDate) {
      setTimeRange('custom');
    }
  };

  const handleGeneratePDF = async () => {
    if (!stats) return;
    
    setIsGeneratingPDF(true);
    try {
      await generateFinanceReportPDF(
        stats, 
        timeRange, 
        customStartDate?.toISOString().split('T')[0], 
        customEndDate?.toISOString().split('T')[0]
      );
      toast({
        title: "PDF Generated Successfully",
        description: "Finance report has been downloaded.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error Generating PDF",
        description: "Failed to generate finance report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
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
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          Financial Management
        </h1>
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