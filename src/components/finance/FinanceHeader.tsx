import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download01Icon, 
  Calendar03Icon,
  TimeQuarterPassIcon,
  CalendarCheckOut01Icon,
  Globe02Icon
} from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import CustomDateRangeDialog from './CustomDateRangeDialog';
import { useAuth } from '@/components/auth/AuthProvider';
import { useFirmData } from '@/hooks/useFirmData';

interface FinanceHeaderProps {
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  stats: any;
  customStartDate?: Date;
  customEndDate?: Date;
  onCustomDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
}

const FinanceHeader = ({ 
  timeRange, 
  onTimeRangeChange, 
  stats, 
  customStartDate, 
  customEndDate, 
  onCustomDateRangeChange
}: FinanceHeaderProps) => {
  const { toast } = useToast();
  const { currentFirmId } = useAuth();
  const { firmData } = useFirmData();
  const [shouldOpenDatePicker, setShouldOpenDatePicker] = useState(false);

  // Auto-open date picker when custom range is selected
  useEffect(() => {
    if (timeRange === 'custom') {
      setShouldOpenDatePicker(true);
    }
  }, [timeRange]);

  const exportFinancialReport = async (exportTimeRange: string) => {
    if (!stats) {
      toast({
        title: "No data available",
        description: "Please wait for financial data to load before exporting",
        variant: "destructive",
      });
      return;
    }

    if (!currentFirmId) {
      toast({
        title: "No firm selected",
        description: "Please select a firm before exporting",
        variant: "destructive",
      });
      return;
    }

    try {
      const { generateFinanceReportPDF } = await import('./FinanceReportPDF');
      await generateFinanceReportPDF(
        stats, 
        exportTimeRange, 
        firmData, 
        currentFirmId,
        customStartDate?.toISOString().split('T')[0],
        customEndDate?.toISOString().split('T')[0]
      );
      
      toast({
        title: "Report exported successfully!",
        description: `Financial report (${exportTimeRange}) PDF has been downloaded`,
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to generate PDF report",
        variant: "destructive",
      });
    }
  };

  const getTimeRangeIcon = (range: string) => {
    switch (range) {
      case 'week':
        return <Calendar03Icon className="h-4 w-4" />;
      case 'month':
        return <CalendarCheckOut01Icon className="h-4 w-4" />;
      case 'quarter':
        return <TimeQuarterPassIcon className="h-4 w-4" />;
      case 'year':
        return <CalendarCheckOut01Icon className="h-4 w-4" />;
      default:
        return <Calendar03Icon className="h-4 w-4" />;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Finance</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="h-10 w-10 rounded-full [&>svg]:hidden p-0 border flex items-center justify-center">
                <SelectValue className="flex items-center justify-center">
                  {getTimeRangeIcon(timeRange)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">
                  <div className="flex items-center gap-2">
                    <Calendar03Icon className="h-4 w-4" />
                    This Week
                  </div>
                </SelectItem>
                <SelectItem value="month">
                  <div className="flex items-center gap-2">
                    <CalendarCheckOut01Icon className="h-4 w-4" />
                    This Month
                  </div>
                </SelectItem>
                <SelectItem value="quarter">
                  <div className="flex items-center gap-2">
                    <TimeQuarterPassIcon className="h-4 w-4" />
                    This Quarter
                  </div>
                </SelectItem>
                <SelectItem value="year">
                  <div className="flex items-center gap-2">
                    <CalendarCheckOut01Icon className="h-4 w-4" />
                    This Year
                  </div>
                </SelectItem>
                <SelectItem value="global">
                  <div className="flex items-center gap-2">
                    <Globe02Icon className="h-4 w-4" />
                    All Time
                  </div>
                </SelectItem>
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <Calendar03Icon className="h-4 w-4" />
                    Custom Range
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <CustomDateRangeDialog
              isOpen={shouldOpenDatePicker}
              onOpenChange={(open) => {
                setShouldOpenDatePicker(open);
                // Don't reset to month when dialog closes - let the user decide what to do
              }}
              onDateRangeChange={(startDate, endDate) => {
                onCustomDateRangeChange(startDate, endDate);
                // Only set timeRange to custom if both dates are selected
                if (startDate && endDate) {
                  onTimeRangeChange('custom');
                }
              }}
              startDate={customStartDate}
              endDate={customEndDate}
            />

             <DropdownMenu>
               <DropdownMenuTrigger asChild>
                 <Button variant="outline" size="icon" className="rounded-full h-10 w-10" disabled={!stats}>
                   <Download01Icon className="h-4 w-4" />
                 </Button>
               </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => exportFinancialReport('week')}>
                  <Calendar03Icon className="h-4 w-4 mr-2" />
                  Weekly Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFinancialReport('month')}>
                  <CalendarCheckOut01Icon className="h-4 w-4 mr-2" />
                  Monthly Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFinancialReport('quarter')}>
                  <TimeQuarterPassIcon className="h-4 w-4 mr-2" />
                  Quarterly Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFinancialReport('year')}>
                  <CalendarCheckOut01Icon className="h-4 w-4 mr-2" />
                  Yearly Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportFinancialReport('global')}>
                  <Globe02Icon className="h-4 w-4 mr-2" />
                  Global Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
      </div>
    </TooltipProvider>
  );
};

export default FinanceHeader;