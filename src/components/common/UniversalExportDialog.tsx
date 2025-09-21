import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download01Icon, FilterIcon } from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';
import { useFirmData } from '@/hooks/useFirmData';

export interface FilterOption {
  value: string;
  label: string;
}

export interface ExportConfig {
  title: string;
  filterTypes: {
    value: string;
    label: string;
    options?: FilterOption[];
  }[];
  exportFunction: (data: any[], filterType: string, filterValue: string, firmData?: any) => Promise<void>;
  getPreviewData: (data: any[], filterType: string, selectedValue: string) => {
    count: number;
    summary?: Record<string, any>;
  };
}

interface UniversalExportDialogProps {
  data: any[];
  config: ExportConfig;
  trigger?: React.ReactNode;
  additionalData?: any;
}

const UniversalExportDialog: React.FC<UniversalExportDialogProps> = ({ 
  data, 
  config, 
  trigger,
  additionalData 
}) => {
  const [filterType, setFilterType] = useState<string>(config.filterTypes[0]?.value || '');
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { firmData } = useFirmData();

  const currentFilterConfig = config.filterTypes.find(ft => ft.value === filterType);
  const hasOptions = currentFilterConfig?.options && currentFilterConfig.options.length > 0;

  const getFilteredData = () => {
    if (filterType === 'global' || filterType === 'all') {
      return data;
    }
    
    if (!selectedValue) return data;

    // Custom filtering logic based on filter type
    return data.filter(item => {
      switch (filterType) {
        case 'category':
          return item.category === selectedValue;
        case 'event_type':
          return item.event_type === selectedValue;
        case 'staff':
          if (selectedValue === 'all_staff' || selectedValue === 'All Staff Members') return true;
          return item.assigned_to === selectedValue || 
                 item.id === selectedValue || 
                 item.full_name === selectedValue ||
                 item.assigned_staff?.id === selectedValue ||
                 item.assigned_staff?.full_name === selectedValue ||
                 item.freelancer?.id === selectedValue ||
                 item.freelancer?.full_name === selectedValue;
        case 'freelancers':
          if (selectedValue === 'all_freelancers' || selectedValue === 'All Freelancers') return true;
          return item.id === selectedValue || item.full_name === selectedValue;
        case 'status':
          // Event-specific status filtering
          if (item.event_date && item.total_amount !== undefined) {
            // This is an event object
            switch (selectedValue) {
              case 'confirmed':
                return item.total_amount && item.total_amount > 0;
              case 'completed':
                return new Date(item.event_date) <= new Date();
              case 'pending':
                return new Date(item.event_date) > new Date();
              case 'paid':
                const totalPaidPaid = item.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
                const actualBalancePaid = Math.max(0, (item.total_amount || 0) - totalPaidPaid);
                return actualBalancePaid <= 0;
              case 'payment_pending':
                const totalPaidPending = item.payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
                const actualBalancePending = Math.max(0, (item.total_amount || 0) - totalPaidPending);
                return actualBalancePending > 0;
              case 'crew_incomplete':
                // Check crew completeness for events
                const quotationDetails = item.quotation_details;
                if (!quotationDetails || !quotationDetails.days) return false;
                
                const staffAssignments = item.event_staff_assignments || [];
                const totalDays = item.total_days || 1;
                
                for (let day = 1; day <= totalDays; day++) {
                  const dayConfig = quotationDetails.days?.[day - 1];
                  if (!dayConfig) continue;
                  
                  const dayAssignments = staffAssignments.filter((assignment: any) => 
                    assignment.day_number === day
                  );
                  
                  const legacyAssignments = staffAssignments.filter((assignment: any) => 
                    !assignment.day_number && totalDays === 1 && day === 1
                  );
                  
                  const allDayAssignments = [...dayAssignments, ...legacyAssignments];
                  
                  const actualPhotographers = allDayAssignments.filter((a: any) => a.role === 'Photographer').length;
                  const actualCinematographers = allDayAssignments.filter((a: any) => a.role === 'Cinematographer').length;
                  const actualDronePilots = allDayAssignments.filter((a: any) => a.role === 'Drone Pilot').length;
                  
                  const requiredPhotographers = dayConfig.photographers || 0;
                  const requiredCinematographers = dayConfig.cinematographers || 0;
                  const requiredDrone = dayConfig.drone || 0;
                  
                  if (actualPhotographers < requiredPhotographers ||
                      actualCinematographers < requiredCinematographers ||
                      actualDronePilots < requiredDrone) {
                    return true;
                  }
                }
                return false;
              default:
                return true;
            }
          } else {
            // Generic status filtering for non-event objects
            return item.status === selectedValue;
          }
        default:
          return true;
      }
    });
  };

  const getFilterDisplayValue = () => {
    if (filterType === 'global' || filterType === 'all') {
      return currentFilterConfig?.label || 'All Items';
    }
    
    if (!selectedValue) return 'Unknown';
    
    const option = currentFilterConfig?.options?.find(opt => opt.value === selectedValue);
    return option?.label || selectedValue;
  };

  const handleExport = async () => {
    const filteredData = getFilteredData();
    
    if (filteredData.length === 0) {
      toast({
        title: "No Data Found",
        description: "No items match the selected filter criteria.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Pass the actual selected value from the dropdown, not the display value
      const actualSelectedValue = selectedValue || (hasOptions ? currentFilterConfig?.options?.[0]?.value : undefined);
      await config.exportFunction(filteredData, filterType, actualSelectedValue || getFilterDisplayValue(), firmData);
      toast({
        title: "Export Successful",
        description: `${config.title} exported with ${filteredData.length} items.`,
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: `Failed to generate ${config.title.toLowerCase()}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isValid = () => {
    if (filterType === 'global' || filterType === 'all') return true;
    if (hasOptions) return selectedValue !== '';
    return true;
  };

  const previewData = config.getPreviewData(getFilteredData(), filterType, selectedValue);

  const defaultTrigger = (
    <Button variant="outline" className="rounded-full p-3" disabled={isExporting}>
      {isExporting ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Download01Icon className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[calc(100vh-6rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Export {config.title}
          </DialogTitle>
          <DialogDescription>
            Choose the statement and filters, then export to PDF.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {config.filterTypes.length > 1 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">Filter Type</Label>
              {config.filterTypes.length <= 3 ? (
                <RadioGroup 
                  value={filterType} 
                  onValueChange={(value) => {
                    setFilterType(value);
                    setSelectedValue(''); // Reset selection when filter type changes
                  }}
                >
                  <div className="space-y-2">
                    {config.filterTypes.map((type) => (
                      <div key={type.value} className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={type.value} id={type.value} />
                        <Label htmlFor={type.value} className="cursor-pointer flex-1">
                          {type.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              ) : (
                <Select 
                  value={filterType} 
                  onValueChange={(value) => {
                    setFilterType(value);
                    setSelectedValue(''); // Reset selection when filter type changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select filter type" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.filterTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {hasOptions && (
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {currentFilterConfig?.label.replace('By ', '')}
              </Label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${currentFilterConfig?.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {currentFilterConfig?.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Records:</span>
                  <span className="font-semibold">{previewData.count}</span>
                </div>
                
                {previewData.summary && Object.entries(previewData.summary).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p>The exported PDF will include detailed information and summaries for record keeping and reporting purposes.</p>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!isValid() || isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <Download01Icon className="h-4 w-4 mr-2" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UniversalExportDialog;
