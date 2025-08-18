import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Add01Icon, RefreshIcon, Download01Icon, Calendar01Icon } from 'hugeicons-react';

import { Event, TaskFromDB, convertDbTaskToTask } from '@/types/studio';
import CleanEventFormDialog from './CleanEventFormDialog';
import EventPaymentCard from '@/components/payments/EventPaymentCard';
import EventStats from './EventStats';
import { PageSkeleton } from '@/components/ui/skeleton';
import PaymentCard from '@/components/payments/PaymentCard';
import { useToast } from '@/hooks/use-toast';
import { generatePaymentInvoicePDF } from '@/components/payments/PaymentInvoicePDFRenderer';
import { shareEventDetails } from '@/lib/event-share-utils';
import { useFirmData } from '@/hooks/useFirmData';
import ShareOptionsDialog from '@/components/common/ShareOptionsDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { EventDeleteConfirmation } from './EventDeleteConfirmation';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useEventExportConfig } from '@/hooks/useExportConfigs';


const EventManagementWithPayments = () => {
  const { profile, currentFirmId } = useAuth();
  const eventExportConfig = useEventExportConfig();
  const [events, setEvents] = useState<Event[]>([]);
  const [optimisticallyDeletedEvents, setOptimisticallyDeletedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedEventForShare, setSelectedEventForShare] = useState<Event | null>(null);
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<Event | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  
  
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
          quotation_source:quotations(
            id,
            title,
            quotation_details,
            amount,
            event_date
          ),
          event_staff_assignments(
            staff_id,
            freelancer_id,
            role,
            day_number,
            profiles(full_name),
            freelancer:freelancers(full_name)
          ),
          tasks(*, assigned_staff:profiles!tasks_assigned_to_fkey(full_name), freelancer:freelancers(full_name)),
          event_closing_balances(*)
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      // Separately fetch payments to avoid relationship conflicts
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('*')
        .eq('firm_id', currentFirmId);

      if (error) {
        console.error('Error loading events:', error);
        throw error;
      }

      // Convert the database tasks to proper Task objects and add quotation details
      const processedEvents = data?.map(event => {
        // Handle quotation_source properly - it could be an array or null
        let quotationDetails = null;
        let quotationSource = null;
        
        if (event.quotation_source) {
          if (Array.isArray(event.quotation_source) && event.quotation_source.length > 0) {
            quotationSource = event.quotation_source[0];
            quotationDetails = quotationSource.quotation_details;
          } else if (!Array.isArray(event.quotation_source)) {
            quotationSource = event.quotation_source;
            quotationDetails = (event.quotation_source as any).quotation_details;
          }
        }

        // Find payments for this event
        const eventPayments = paymentsData?.filter(payment => payment.event_id === event.id) || [];

        return {
          ...event,
          quotation_details: quotationDetails,
          quotation_source: quotationSource,
          payments: eventPayments,
          tasks: event.tasks?.map((task: TaskFromDB) => convertDbTaskToTask(task)) || []
        };
      }) || [];
      
      setEvents(processedEvents as any);
      
      // Clear optimistically deleted events that are no longer in the database
      setOptimisticallyDeletedEvents(prev => {
        const currentEventIds = new Set(processedEvents.map(e => e.id));
        const stillDeleted = new Set<string>();
        prev.forEach(deletedId => {
          if (!currentEventIds.has(deletedId)) {
            stillDeleted.add(deletedId);
          }
        });
        return stillDeleted;
      });
      
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
    setOptimisticallyDeletedEvents(new Set()); // Clear optimistic deletions on refresh
    await loadEvents();
    setRefreshing(false);
    toast({
      title: "Events refreshed",
      description: "Event data has been updated successfully.",
    });
  };

  const handleEditEvent = (event: Event) => {
    console.log('Opening edit dialog for event:', event.id, event.title);
    setEditingEvent(event);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    console.log('Closing edit dialog');
    setEditDialogOpen(false);
    // Don't clear editing event immediately to prevent race conditions
    setTimeout(() => {
      setEditingEvent(null);
    }, 300);
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

  const handleDownloadInvoice = async (event: Event) => {
    try {
      const paymentData = {
        id: `event-${event.id}`,
        event_id: event.id,
        amount: event.total_amount || 0,
        payment_method: 'Cash' as const,
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

  const handleShare = (event: Event) => {
    setSelectedEventForShare(event);
    setShareDialogOpen(true);
  };

  const handleDirectToClient = async () => {
    if (!selectedEventForShare) return;
    
    if (!selectedEventForShare.client?.phone) {
      toast({
        title: "No Phone Number",
        description: "Client doesn't have a phone number for WhatsApp sharing.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await shareEventDetails(selectedEventForShare, firmData, 'direct');
      if (result.success) {
        toast({
          title: "Sent to Client!",
          description: `Event details sent to ${selectedEventForShare.client.name} via WhatsApp`
        });
      } else {
        toast({
          title: "WhatsApp Error", 
          description: result.error || "Failed to send event details to client",
          variant: "destructive"
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send event details to client';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleCustomShare = async () => {
    if (!selectedEventForShare) return;
    
    try {
      const result = await shareEventDetails(selectedEventForShare, firmData, 'custom');
      if (result.success) {
        let title = "Shared Successfully!";
        let description = "Event details shared successfully";
        
        if ('method' in result) {
          const shareResult = result as any;
          if (shareResult.method === 'download') {
            title = "Download Complete!";
            description = "Event PDF downloaded successfully";
          } else if (shareResult.method === 'text_share_with_download') {
            title = "Shared with PDF!";
            description = "Event details shared and PDF downloaded for manual sharing";
          }
        }
        
        toast({
          title,
          description
        });
      } else {
        throw new Error('Share failed');
      }
    } catch (error) {
      console.error('Error sharing event:', error);
      toast({
        title: "Error",
        description: "Failed to share event details",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEvent = (event: Event) => {
    setEventToDelete(event);
  };

  const handleOptimisticDelete = (eventId: string) => {
    console.log('🎯 OPTIMISTIC: Hiding event from UI:', eventId);
    setOptimisticallyDeletedEvents(prev => new Set([...prev, eventId]));
  };

  const handleEventDeleted = () => {
    // This will be called after background processes complete to refresh data
    loadEvents();
    setEventToDelete(null);
  };

  // Helper function to check crew completeness - defined before usage
  const checkEventCrewCompleteness = (event: Event) => {
    const eventWithStaff = event as any;
    
    // If no quotation details, consider it complete (not incomplete)
    const quotationDetails = eventWithStaff.quotation_details;
    if (!quotationDetails || !quotationDetails.days) return false;
    
    const staffAssignments = eventWithStaff.event_staff_assignments || [];
    const totalDays = eventWithStaff.total_days || 1;
    
    // Check each day for crew completeness
    for (let day = 1; day <= totalDays; day++) {
      const dayConfig = quotationDetails.days?.[day - 1];
      if (!dayConfig) continue;
      
      // Count actual assignments for this specific day
      const dayAssignments = staffAssignments.filter((assignment: any) => 
        assignment.day_number === day
      );
      
      // For legacy events without day_number, include them only for day 1 of single-day events
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
      
      // If any requirement is not met, the event is crew incomplete
      if (actualPhotographers < requiredPhotographers ||
          actualCinematographers < requiredCinematographers ||
          actualDronePilots < requiredDrone) {
        return true;
      }
    }
    
    // All days have complete crew
    return false;
  };

  // Filter out optimistically deleted events
  const visibleEvents = events.filter(event => !optimisticallyDeletedEvents.has(event.id));

  // Show all events without filtering
  const eventsToShow = visibleEvents;

  const statusFilters = [
    { value: 'all', label: 'All Events', count: visibleEvents.length },
    { value: 'confirmed', label: 'Confirmed', count: visibleEvents.filter(e => e.total_amount && e.total_amount > 0).length },
    { value: 'completed', label: 'Completed', count: visibleEvents.filter(e => new Date(e.event_date) <= new Date()).length },
    { value: 'pending', label: 'Work Pending', count: visibleEvents.filter(e => new Date(e.event_date) > new Date()).length },
    { value: 'crew_incomplete', label: 'Staff Incomplete', count: visibleEvents.filter(checkEventCrewCompleteness).length },
    { 
      value: 'paid', 
      label: 'Paid', 
      count: visibleEvents.filter(e => {
        const totalPaid = (e as any).payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
        return Math.max(0, (e.total_amount || 0) - totalPaid) <= 0;
      }).length 
    },
    { 
      value: 'payment_pending', 
      label: 'Payment Due', 
      count: visibleEvents.filter(e => {
        const totalPaid = (e as any).payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
        return Math.max(0, (e.total_amount || 0) - totalPaid) > 0;
      }).length 
    }
  ];

  const sortOptions = [
    { value: 'event_date', label: 'Event Date' },
    { value: 'title', label: 'Event Title' },
    { value: 'total_amount', label: 'Total Amount' },
    { value: 'balance_amount', label: 'Balance Amount' }
  ];

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Events
        </h1>
          <div className="flex gap-2">
            <UniversalExportDialog
              data={visibleEvents}
              config={eventExportConfig}
            />
            <Button onClick={() => setCreateDialogOpen(true)} size="icon" className="h-10 w-10 rounded-full">
              <Add01Icon className="h-5 w-5" />
            </Button>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="icon"
              disabled={refreshing}
              className="h-10 w-10 rounded-full"
            >
              <RefreshIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
      </div>

      <EventStats events={visibleEvents} />


      {eventsToShow.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Calendar01Icon className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No events found</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Get started by creating your first event
          </p>
          <Button className="rounded-full p-3" onClick={() => setCreateDialogOpen(true)}>
            Create Event
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {eventsToShow.map((event) => (
            <EventPaymentCard
              key={event.id}
              event={event}
              onEdit={handleEditEvent}
              onPaymentClick={handlePaymentRecord}
              onDownloadInvoice={handleDownloadInvoice}
              onSendInvoice={handleShare}
              onDelete={handleDeleteEvent}
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

      <EventDeleteConfirmation
        event={eventToDelete}
        open={!!eventToDelete}
        onOpenChange={(open) => !open && setEventToDelete(null)}
        onSuccess={handleEventDeleted}
        onOptimisticDelete={handleOptimisticDelete}
      />

      <ShareOptionsDialog
        isOpen={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onDirectToClient={handleDirectToClient}
        onCustomShare={handleCustomShare}
        title="Share Event Details"
      />
    </div>
  );
};

export default EventManagementWithPayments;
