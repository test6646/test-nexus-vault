import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar01Icon, Add01Icon, RefreshIcon, ChartLineData02Icon, ChartDecreaseIcon, DollarCircleIcon } from 'hugeicons-react';
import { CreditCardIcon } from 'hugeicons-react';
import { Event, TaskFromDB, convertDbTaskToTask } from '@/types/studio';
import PaymentCard from './PaymentCard';
import EventPaymentCard from './EventPaymentCard';
import StatsGrid from '@/components/ui/stats-grid';
import { calculatePaymentStats } from '@/lib/payment-calculator';
import { generatePaymentInvoicePDF } from './PaymentInvoicePDFRenderer';
import CleanEventFormDialog from '@/components/events/CleanEventFormDialog';
import { useFirmData } from '@/hooks/useFirmData';
import { EmptyState } from '@/components/ui/empty-state';

const PaymentManagement = () => {
  const { currentFirmId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<Event | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const { firmData } = useFirmData();

  useEffect(() => {
    if (currentFirmId) {
      loadEvents();
      
      const paymentsChannel = supabase
        .channel('payments-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public', 
          table: 'payments',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          loadEvents();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(paymentsChannel);
      };
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
          tasks(id, title, task_type, status, created_at)
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('firm_id', currentFirmId);

      if (error) throw error;

      const processedEvents = data?.map(event => {
        const eventPayments = paymentsData?.filter(payment => payment.event_id === event.id) || [];
        return {
          ...event,
          payments: eventPayments,
          tasks: event.tasks?.map((task: TaskFromDB) => convertDbTaskToTask(task)) || []
        };
      }) || [];
      
      setEvents(processedEvents as any);
    } catch (error: any) {
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
    await loadEvents();
    toast({
      title: "Events refreshed",
      description: "Event data has been updated successfully.",
    });
  };

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
      const { data: invoiceId } = await supabase.rpc('generate_invoice_id', { p_event_id: event.id });
      
      const paymentData = {
        id: `event-${event.id}`,
        event_id: event.id,
        amount: event.total_amount || 0,
        payment_method: 'Digital' as const,
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
    await handleDownloadInvoice(event);
  };

  const stats = calculatePaymentStats(events);

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
            disabled={loading}
            className="rounded-full p-3"
          >
            <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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

      {/* Events */}
      {events.length === 0 ? (
        <EmptyState
          icon={CreditCardIcon}
          title="No Events Found"
          description="Create events with payment amounts to start managing payments."
          action={{
            label: "Create First Event",
            onClick: () => window.location.href = '/events'
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventPaymentCard
              key={event.id}
              event={event}
              onEdit={handleEditEvent}
              onPaymentClick={handlePaymentRecord}
              onViewDetails={() => {}}
              onDownloadInvoice={handleDownloadInvoice}
              onSendInvoice={handleSendInvoice}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {selectedEventForPayment && (
        <PaymentCard
          event={selectedEventForPayment}
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onPaymentCollected={handlePaymentCollected}
        />
      )}

      <CleanEventFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadEvents}
      />

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
