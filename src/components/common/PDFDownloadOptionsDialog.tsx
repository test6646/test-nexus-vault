import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download01Icon, File01Icon } from 'hugeicons-react';
import { useToast } from '@/hooks/use-toast';

interface PDFDownloadOptionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadInvoice: () => Promise<void>;
  onDownloadEventReport: () => Promise<void>;
  title?: string;
}

const PDFDownloadOptionsDialog = ({ 
  isOpen, 
  onOpenChange, 
  onDownloadInvoice, 
  onDownloadEventReport,
  title = "Download PDF"
}: PDFDownloadOptionsDialogProps) => {
  const [isLoading, setIsLoading] = useState<'invoice' | 'report' | null>(null);
  const { toast } = useToast();

  const handleDownloadInvoice = async () => {
    setIsLoading('invoice');
    try {
      await onDownloadInvoice();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to download invoice. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleDownloadEventReport = async () => {
    setIsLoading('report');
    try {
      await onDownloadEventReport();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to download event report. Please try again.';
      toast({
        title: "Error", 
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <Button
            onClick={handleDownloadInvoice}
            disabled={isLoading !== null}
            className="w-full h-14 rounded-xl text-left justify-start space-x-3"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20">
              <Download01Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Download Invoice</div>
              <div className="text-xs opacity-80">Payment invoice PDF</div>
            </div>
            {isLoading === 'invoice' && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
          </Button>

          <Button
            onClick={handleDownloadEventReport}
            disabled={isLoading !== null}
            variant="outline"
            className="w-full h-14 rounded-xl text-left justify-start space-x-3"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
              <File01Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Download Event Report</div>
              <div className="text-xs text-muted-foreground">Detailed event report PDF</div>
            </div>
            {isLoading === 'report' && (
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFDownloadOptionsDialog;