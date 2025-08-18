import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { useToast } from '@/hooks/use-toast';
import { Calendar01Icon, UserIcon, Location01Icon, DollarCircleIcon, Add01Icon, RefreshIcon, ChartLineData02Icon, ChartDecreaseIcon, Download01Icon, Share01Icon } from 'hugeicons-react';
import { CreditCard } from 'lucide-react';
import { Event, Payment, TaskFromDB, convertDbTaskToTask } from '@/types/studio';
import PaymentCard from './PaymentCard';
import EventPaymentCard from './EventPaymentCard';
import StatsGrid from '@/components/ui/stats-grid';
import { calculatePaymentStats } from '@/lib/payment-calculator';

import { format } from 'date-fns';
import { generatePaymentInvoicePDF } from './PaymentInvoicePDFRenderer';
import CleanEventFormDialog from '@/components/events/CleanEventFormDialog';
import { useFirmData } from '@/hooks/useFirmData';
import { EmptyState } from '@/components/ui/empty-state';

const PaymentManagement = () => {
  const { profile, currentFirmId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { toast } = useToast();
  const { firmData } = useFirmData();

  useEffect(() => {
    if (currentFirmId) {
      loadEvents();
    }
  }, [currentFirmId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(*),
          event_staff_assignments(
            staff_id,
            role,
            day_number,
            profiles(full_name)
          ),
          tasks(id, title, task_type, status, created_at)
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      // Separately fetch payments and closing balances to avoid relationship conflicts
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('firm_id', currentFirmId);

      const { data: closingBalancesData } = await supabase
        .from('event_closing_balances')
        .select('*')
        .eq('firm_id', currentFirmId);

      if (error) {
        console.error('Error loading events:', error);
        throw error;
      }

      // Convert the database tasks to proper Task objects and attach payments and closing balances
      const processedEvents = data?.map(event => {
        // Find payments for this event
        const eventPayments = paymentsData?.filter(payment => payment.event_id === event.id) || [];
        
        // Find closing balances for this event
        const eventClosingBalances = closingBalancesData?.filter(closing => closing.event_id === event.id) || [];
        
        return {
          ...event,
          payments: eventPayments,
          event_closing_balances: eventClosingBalances,
          tasks: event.tasks?.map((task: TaskFromDB) => convertDbTaskToTask(task)) || []
        };
      }) || [];
      
      setEvents(processedEvents as any);
    } catch (error: any) {
      console.error('Error in loadEvents:', error);
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
    toast({
      title: "Events refreshed",
      description: "Event data has been updated successfully.",
    });
  };

  const [selectedEventForPayment, setSelectedEventForPayment] = useState<Event | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const handlePaymentRecord = (event: Event) => {
    setSelectedEventForPayment(event);
    setPaymentDialogOpen(true);
  };

  const handlePaymentCollected = () => {
    loadEvents();
    setPaymentDialogOpen(false);
    setSelectedEventForPayment(null);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setTimeout(() => {
      setEditingEvent(null);
    }, 100);
  };

  const handleDownloadInvoice = async (event: Event) => {
    try {
      // Create a payment object from event data for PDF generation
      const paymentData = {
        id: `event-${event.id}`,
        event_id: event.id,
        amount: event.total_amount || 0,
        payment_method: 'Digital' as const,
        payment_date: new Date().toISOString(),
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
    }
  };

  const handleSendInvoice = async (event: Event) => {
    try {
      // Create a payment object from event data for PDF generation
      const paymentData = {
        id: `event-${event.id}`,
        event_id: event.id,
        amount: event.total_amount || 0,
        payment_method: 'Digital' as const,
        payment_date: new Date().toISOString(),
        event: event,
        firm_id: event.firm_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (navigator.share) {
        // For now, just download the PDF since sharing blob files requires more complex setup
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
        // Fallback for browsers that don't support Web Share API
        await handleDownloadInvoice(event);
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
    }
  };

  const stats = calculatePaymentStats(events);

  // Show all events without filtering
  const eventsToShow = events;


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Payments</h1>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Events & Payments</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateDialogOpen(true)} className="rounded-full p-3">
            <Add01Icon className="h-4 w-4" />
          </Button>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={refreshing}
            className="rounded-full p-3"
          >
            <RefreshIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Payment Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatsGrid stats={[
          {
            title: "Total Events",
            value: stats.totalEvents,
            icon: <Calendar01Icon className="h-4 w-4" />,
            colorClass: "bg-primary/20 text-primary"
          },
          {
            title: "Total Revenue",
            value: `₹${stats.totalRevenue.toLocaleString()}`,
            icon: <DollarCircleIcon className="h-4 w-4" />,
            colorClass: "bg-primary/20 text-primary"
          },
          {
            title: "Amount Received",
            value: `₹${stats.totalPaid.toLocaleString()}`,
            icon: <ChartLineData02Icon className="h-4 w-4" />,
            colorClass: "bg-primary/20 text-primary"
          },
          {
            title: "Amount Closed",
            value: `₹${stats.totalClosed.toLocaleString()}`,
            icon: <ChartDecreaseIcon className="h-4 w-4" />,
            colorClass: "bg-muted/20 text-muted-foreground"
          },
          {
            title: "Amount Pending",
            value: `₹${stats.totalPending.toLocaleString()}`,
            icon: <ChartDecreaseIcon className="h-4 w-4" />,
            colorClass: "bg-warning/20 text-warning"
          }
        ]} />
      </div>


      {/* Events with Payment Information - 4x4 Grid */}
      {eventsToShow.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No Events Found"
          description="Create events with payment amounts to start managing payments and generating invoices."
          action={{
            label: "Create First Event",
            onClick: () => window.location.href = '/events'
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {eventsToShow.map((event) => (
            <EventPaymentCard
              key={event.id}
              event={event}
              onEdit={handleEditEvent}
              onPaymentClick={handlePaymentRecord}
              onDownloadInvoice={handleDownloadInvoice}
              onSendInvoice={handleSendInvoice}
            />
          ))}
        </div>
      )}

      {/* Payment Collection Dialog */}
      {selectedEventForPayment && (
        <PaymentCard
          event={selectedEventForPayment}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onPaymentCollected={handlePaymentCollected}
        />
      )}

      {/* Event Creation Dialog */}
      <CleanEventFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadEvents}
      />

      {/* Event Edit Dialog */}
      <CleanEventFormDialog
        open={editDialogOpen}
        onOpenChange={handleCloseEditDialog}
        editingEvent={editingEvent}
        onSuccess={() => {
          loadEvents();
          handleCloseEditDialog();
        }}
      />
    </div>
  );
};

export default PaymentManagement;
