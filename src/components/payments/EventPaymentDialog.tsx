import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getEventTypeColors } from '@/lib/status-colors';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Location01Icon, 
  Camera01Icon, 
  Video01Icon, 
  Scissor01Icon, 
  HardDriveIcon, 
  Calendar01Icon, 
  UserCircleIcon, 
  MoneyBag02Icon, 
  Download01Icon, 
  Share01Icon, 
  Add01Icon,
  CreditCardIcon,
  Note01Icon
} from 'hugeicons-react';
import { Event } from '@/types/studio';
import { format } from 'date-fns';
import { generatePaymentInvoicePDF } from './PaymentInvoicePDFRenderer';
import { useFirmData } from '@/hooks/useFirmData';
import BalanceDisplay from '@/components/ui/balance-display';
import { calculateEventBalance, calculateTotalPaid } from '@/lib/payment-calculator';

interface EventPaymentDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentClick: (event: Event) => void;
}

const EventPaymentDialog = ({ event, open, onOpenChange, onPaymentClick }: EventPaymentDialogProps) => {
  const { toast } = useToast();
  const { firmData } = useFirmData();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!event) return null;

  const getEventTypeColor = (eventType: string) => {
    return `${getEventTypeColors(eventType, 'background')} ${getEventTypeColors(eventType, 'text')} border-${getEventTypeColors(eventType, 'background').replace('bg-', '')}`;
  };

  const handleDownloadInvoice = async () => {
    try {
      setDownloading(true);
      // Generate proper invoice ID for this event
      const { data: invoiceId } = await supabase.rpc('generate_invoice_id', { p_event_id: event.id });
      
      const paymentData = {
        id: `event-${event.id}`,
        event_id: event.id,
        amount: event.total_amount || 0,
        payment_method: 'Cash' as const,
        payment_date: new Date().toISOString(),
        invoice_id: invoiceId,
        event: event,
        firm_id: event.firm_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await generatePaymentInvoicePDF(paymentData, firmData);
      if (result.success) {
        toast({
          title: "Invoice downloaded",
          description: "The payment invoice has been downloaded successfully.",
        });
      } else {
        throw new Error('PDF generation failed');
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the invoice.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSendInvoice = async () => {
    try {
      setSharing(true);
      // Generate proper invoice ID for this event
      const { data: invoiceId } = await supabase.rpc('generate_invoice_id', { p_event_id: event.id });
      
      const paymentData = {
        id: `event-${event.id}`,
        event_id: event.id,
        amount: event.total_amount || 0,
        payment_method: 'Cash' as const,
        payment_date: new Date().toISOString(),
        invoice_id: invoiceId,
        event: event,
        firm_id: event.firm_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (navigator.share) {
        const result = await generatePaymentInvoicePDF(paymentData, firmData);
        if (result.success) {
          toast({
            title: "Invoice generated",
            description: "Invoice has been downloaded. You can share it manually.",
          });
        } else {
          throw new Error('PDF generation failed');
        }
      } else {
        await handleDownloadInvoice();
        toast({
          title: "Share not supported",
          description: "Your browser doesn't support sharing. Invoice has been downloaded instead.",
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: "Share failed",
          description: "Failed to generate the invoice.",
          variant: "destructive",
        });
      }
    } finally {
      setSharing(false);
    }
  };

  // ✅ FIXED: Proper payment status calculation using payment calculator
  const getPaymentStatus = () => {
    const totalAmount = event.total_amount || 0;
    const totalPaid = calculateTotalPaid(event as any);
    const balanceAmount = calculateEventBalance(event as any);
    
    // PAID: Total amount exists and balance is 0 or negative
    if (totalAmount > 0 && balanceAmount <= 0) return 'PAID';
    // PARTIAL: Some payment made but balance still exists
    if (totalPaid > 0 && balanceAmount > 0) return 'PARTIAL';
    // PENDING: No payment made
    return 'PENDING';
  };
  
  const paymentStatus = getPaymentStatus();
  const isPaid = paymentStatus === 'PAID';
  const isPartial = paymentStatus === 'PARTIAL';
  const hasPendingAmount = calculateEventBalance(event as any) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
            <Calendar01Icon className="h-5 w-5 text-primary" />
            Event Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {/* Event Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h2 className="text-2xl font-bold text-primary">{event.title}</h2>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${getEventTypeColors(event.event_type)}`}>
                    {event.event_type}
                  </span>
                  <Badge variant={isPaid ? "default" : isPartial ? "secondary" : "destructive"}>
                    {paymentStatus}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar01Icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">Event Date:</span>
                  <span>{format(new Date(event.event_date), 'PPP')}</span>
                </div>
                
                {event.venue && (
                  <div className="flex items-center gap-2">
                    <Location01Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">Venue:</span>
                    <span>{event.venue}</span>
                  </div>
                )}
                
                {event.client && (
                  <div className="flex items-center gap-2">
                    <UserCircleIcon className="h-4 w-4 text-primary" />
                    <span className="font-medium">Client:</span>
                    <span>{event.client.name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {event.photographer && (
                  <div className="flex items-center gap-2">
                    <Camera01Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">Photographer:</span>
                    <span>{event.photographer.full_name}</span>
                  </div>
                )}
                
                {event.cinematographer && (
                  <div className="flex items-center gap-2">
                    <Video01Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">Cinematographer:</span>
                    <span>{event.cinematographer.full_name}</span>
                  </div>
                )}
                
                {event.drone_pilot && (
                  <div className="flex items-center gap-2">
                    <Video01Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">Drone Pilot:</span>
                    <span>{event.drone_pilot.full_name}</span>
                  </div>
                )}
                
                {event.editor && (
                  <div className="flex items-center gap-2">
                    <Scissor01Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">Editor:</span>
                    <span>{event.editor.full_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Status */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-primary">Project Progress</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${event.photo_editing_status ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium">Photo Editing</span>
                  <Badge variant={event.photo_editing_status ? "default" : "secondary"} className="text-xs">
                    {event.photo_editing_status ? 'COMPLETED' : 'PENDING'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${event.video_editing_status ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium">Video Editing</span>
                  <Badge variant={event.video_editing_status ? "default" : "secondary"} className="text-xs">
                    {event.video_editing_status ? 'COMPLETED' : 'PENDING'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary and Storage in Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Summary */}
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-primary">Payment Summary</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Total Amount:</span>
                  <span className="font-bold text-lg text-primary">₹{event.total_amount?.toLocaleString() || '0'}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Amount Received:</span>
                  <span className="font-semibold text-green-600">₹{event.advance_amount?.toLocaleString() || '0'}</span>
                </div>
                
                {hasPendingAmount && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Balance Due:</span>
                    <div className="font-semibold text-orange-600">
                      <BalanceDisplay event={event} showIcon={true} />
                    </div>
                  </div>
                )}
              </div>

              {event.payments && event.payments.length > 0 && (
                <div className="border-t border-primary/20 pt-3">
                  <h4 className="font-medium text-primary mb-2 text-sm">Payment History</h4>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {event.payments.map((payment: any) => (
                      <div key={payment.id} className="flex justify-between items-center text-xs bg-background/50 rounded p-2">
                        <div>
                          <span className="font-medium">₹{payment.amount.toLocaleString()}</span>
                          <span className="text-muted-foreground ml-1">({payment.payment_method})</span>
                        </div>
                        <span className="text-muted-foreground">
                          {format(new Date(payment.payment_date), 'MMM dd')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Storage Information */}
            {event.storage_disk && (
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDriveIcon className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-primary">Storage Information</h3>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Disk:</span> {event.storage_disk}
                  {event.storage_size && (
                    <>
                      <span className="mx-2">•</span>
                      <span className="font-medium">Size:</span> {event.storage_size}GB
                    </>
                  )}
                </div>
              </div>
            )}
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventPaymentDialog;