
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshIcon, AlertCircleIcon, Calendar01Icon, LinkSquare01Icon, File01Icon } from 'hugeicons-react';
import RefinedEventSheetTable from './RefinedEventSheetTable';
import FinanceHeader from '@/components/finance/FinanceHeader';
const EventSheetManagement = () => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const [firm, setFirm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    if (currentFirmId) {
      loadFirmData();
    }
  }, [currentFirmId]);

  const loadFirmData = async () => {
    try {
      setLoading(true);
      
      
      const { data: firmData, error } = await supabase
        .from('firms')
        .select('id, name, spreadsheet_id, calendar_id')
        .eq('id', currentFirmId)
        .single();

      if (error) {
        console.error('❌ Error loading firm data:', error);
        throw error;
      }

      
      setFirm(firmData);
    } catch (error: any) {
      console.error('💥 Failed to load firm data:', error);
      toast({
        title: "Error loading firm data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCalendar = () => {
    if (firm?.calendar_id) {
      const calendarUrl = `https://calendar.google.com/calendar/u/0/r?cid=${firm.calendar_id}`;
      window.open(calendarUrl, '_blank');
      
      toast({
        title: "Opening Calendar",
        description: "Your studio calendar is opening in a new tab",
      });
    } else {
      toast({
        title: "No Calendar Found",
        description: "This firm doesn't have a calendar configured yet",
        variant: "destructive",
      });
    }
  };

  const handleOpenSpreadsheet = () => {
    if (firm?.spreadsheet_id) {
      const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${firm.spreadsheet_id}`;
      window.open(spreadsheetUrl, '_blank');
      
      toast({
        title: "Opening Spreadsheet",
        description: "Your studio spreadsheet is opening in a new tab",
      });
    } else {
      toast({
        title: "No Spreadsheet Found",
        description: "This firm doesn't have a spreadsheet configured yet",
        variant: "destructive",
      });
    }
  };


  if (loading) {
    return null; // Don't show anything while loading
  }

  if (!firm) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon className="h-4 w-4" />
        <AlertDescription>
          No firm data found. Please ensure you have a firm selected.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom Finance Header without icon and with action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Event Sheet</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={loadFirmData}
            className="rounded-full p-3"
          >
            <RefreshIcon className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleOpenSpreadsheet}
            disabled={!firm?.spreadsheet_id}
            className="rounded-full p-3"
          >
            <File01Icon className={`h-4 w-4 ${firm?.spreadsheet_id ? 'text-emerald-600' : 'text-rose-600'}`} />
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleOpenCalendar}
            disabled={!firm?.calendar_id}
            className="rounded-full p-3"
          >
            <Calendar01Icon className={`h-4 w-4 ${firm?.calendar_id ? 'text-emerald-600' : 'text-rose-600'}`} />
          </Button>
        </div>
      </div>

      {/* Events Table */}
      <RefinedEventSheetTable />
    </div>
  );
};

export default EventSheetManagement;
