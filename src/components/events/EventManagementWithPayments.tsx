import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Add01Icon, RefreshIcon, Download01Icon } from 'hugeicons-react';
import { CalendarIcon } from 'lucide-react';
import { Event, TaskFromDB, convertDbTaskToTask } from '@/types/studio';
import CleanEventFormDialog from './CleanEventFormDialog';
import UnifiedSearchFilter from '@/components/common/UnifiedSearchFilter';
import EventPaymentCard from '@/components/payments/EventPaymentCard';
import EventStats from './EventStats';
import { PageSkeleton } from '@/components/ui/skeleton';
import PaymentCard from '@/components/payments/PaymentCard';
import { useToast } from '@/hooks/use-toast';
import { generatePaymentInvoicePDF } from '@/components/payments/PaymentInvoicePDFRenderer';
import { shareEventDetails } from '@/lib/event-share-utils';
import { EmptyState } from '@/components/ui/empty-state';
import { EventDeleteConfirmation } from './EventDeleteConfirmation';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { useEventExportConfig } from '@/hooks/useExportConfigs';


const EventManagementWithPayments = () => {
  const { profile } = useAuth();
  const eventExportConfig = useEventExportConfig();
  const [events, setEvents] = useState<Event[]>([]);
  const [optimisticallyDeletedEvents, setOptimisticallyDeletedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('event_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedEventForPayment, setSelectedEventForPayment] = useState<Event | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  
  
  const { toast } = useToast();
  

  useEffect(() => {
    if (profile?.current_firm_id) {
      loadEvents();
    }
  }, [profile?.current_firm_id]);

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
            profiles!fk_event_staff_assignments_staff_id(full_name),
            freelancer:freelancers(full_name)
          ),
          payments(*),
          tasks(*)
        `)
        .eq('firm_id', profile?.current_firm_id)
        .order('event_date', { ascending: false });

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

        return {
          ...event,
          quotation_details: quotationDetails,
          quotation_source: quotationSource,
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
        payment_method: 'Bank Transfer' as const,
        payment_date: new Date().toISOString(),
        event: event,
        firm_id: event.firm_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const result = await generatePaymentInvoicePDF(paymentData);
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
      const result = await shareEventDetails(event);
      if (result.success) {
        let title = "Shared successfully!";
        let description = "Event details have been shared";
        
        switch (result.method) {
          case 'file_share':
            title = "Invoice Shared!";
            description = "Event invoice PDF has been shared directly";
            break;
          case 'text_share_with_download':
            title = "Shared with Invoice!";
            description = "Details shared and invoice downloaded for manual sharing";
            break;
          case 'clipboard_with_download':
            title = "Copied & Downloaded!";
            description = "Details copied to clipboard and invoice downloaded";
            break;
          case 'download_only':
            title = "Invoice Downloaded!";
            description = "Invoice downloaded - share it manually from your downloads";
            break;
        }
        
        toast({
          title,
          description,
        });
      } else {
        throw new Error('Sharing failed');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({
          title: "Share failed",
          description: "Failed to share event details.",
          variant: "destructive",
        });
      }
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

  const filteredEvents = visibleEvents.filter(event => {
    const searchRegex = new RegExp(searchTerm, 'i');
    const searchMatch = searchRegex.test(event.title) || 
                       searchRegex.test(event.event_type) ||
                       searchRegex.test(event.client?.name || '') ||
                       searchRegex.test(event.venue || '');
    
    let statusMatch = true;
    if (statusFilter === 'confirmed') {
      statusMatch = event.total_amount && event.total_amount > 0;
    } else if (statusFilter === 'completed') {
      statusMatch = new Date(event.event_date) <= new Date();
    } else if (statusFilter === 'pending') {
      statusMatch = new Date(event.event_date) > new Date();
    } else if (statusFilter === 'paid') {
      // Calculate actual balance based on all payments
      const totalPaid = (event as any).payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
      const actualBalance = Math.max(0, (event.total_amount || 0) - totalPaid);
      statusMatch = actualBalance <= 0;
    } else if (statusFilter === 'payment_pending') {
      // Calculate actual balance based on all payments
      const totalPaid = (event as any).payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
      const actualBalance = Math.max(0, (event.total_amount || 0) - totalPaid);
      statusMatch = actualBalance > 0;
    } else if (statusFilter === 'crew_incomplete') {
      statusMatch = checkEventCrewCompleteness(event);
    }
    
    return searchMatch && statusMatch;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    if (sortBy === 'event_date') {
      return direction * (new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    } else if (sortBy === 'title') {
      return direction * a.title.localeCompare(b.title);
    } else if (sortBy === 'total_amount') {
      return direction * ((a.total_amount || 0) - (b.total_amount || 0));
    } else if (sortBy === 'balance_amount') {
      return direction * ((a.balance_amount || 0) - (b.balance_amount || 0));
    }
    
    return 0;
  });

  const statusFilters = [
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Events</h1>
        <div className="flex gap-2">
        <UniversalExportDialog
          data={visibleEvents}
          config={eventExportConfig}
        />
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

      <EventStats events={visibleEvents} />

      <UnifiedSearchFilter
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilters={statusFilters}
        selectedStatus={statusFilter}
        onStatusChange={setStatusFilter}
        sortOptions={sortOptions}
        selectedSort={sortBy}
        onSortChange={setSortBy}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        placeholder="Search events by title, client, or venue..."
        className="mb-6"
      />

      {sortedEvents.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="No events found"
          description={searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by creating your first event'}
          action={!searchTerm && statusFilter === 'all' ? {
            label: "Create Event",
            onClick: () => setCreateDialogOpen(true)
          } : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedEvents.map((event) => (
            <EventPaymentCard
              key={event.id}
              event={event}
              onEdit={handleEditEvent}
              onPaymentClick={handlePaymentRecord}
              onDownloadInvoice={handleDownloadInvoice}
              onSendInvoice={handleSendInvoice}
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

    </div>
  );
};

export default EventManagementWithPayments;
