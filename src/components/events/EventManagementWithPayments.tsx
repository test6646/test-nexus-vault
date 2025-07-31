import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Add01Icon, RefreshIcon } from 'hugeicons-react';
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


const EventManagementWithPayments = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
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
          photographer:profiles!events_photographer_id_fkey(*),
          videographer:profiles!events_videographer_id_fkey(*),
          editor:profiles!events_editor_id_fkey(*),
          event_staff_assignments(
            staff_id,
            role,
            day_number,
            profiles(full_name)
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

      // Convert the database tasks to proper Task objects
      const processedEvents = data?.map(event => ({
        ...event,
        tasks: event.tasks?.map((task: TaskFromDB) => convertDbTaskToTask(task)) || []
      })) || [];
      
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

  const filteredEvents = events.filter(event => {
    const searchRegex = new RegExp(searchTerm, 'i');
    const searchMatch = searchRegex.test(event.title) || 
                       searchRegex.test(event.event_type) ||
                       searchRegex.test(event.client?.name || '') ||
                       searchRegex.test(event.venue || '');
    
    let statusMatch = true;
    if (statusFilter === 'confirmed') {
      statusMatch = event.total_amount && event.total_amount > 0;
    } else if (statusFilter === 'completed') {
      statusMatch = event.photo_editing_status && event.video_editing_status;
    } else if (statusFilter === 'pending') {
      statusMatch = !event.photo_editing_status || !event.video_editing_status;
    } else if (statusFilter === 'paid') {
      statusMatch = (event.balance_amount || 0) <= 0;
    } else if (statusFilter === 'payment_pending') {
      statusMatch = (event.balance_amount || 0) > 0;
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
    { value: 'confirmed', label: 'Confirmed', count: events.filter(e => e.total_amount && e.total_amount > 0).length },
    { value: 'completed', label: 'Completed', count: events.filter(e => e.photo_editing_status && e.video_editing_status).length },
    { value: 'pending', label: 'Work Pending', count: events.filter(e => !e.photo_editing_status || !e.video_editing_status).length },
    { value: 'paid', label: 'Paid', count: events.filter(e => (e.balance_amount || 0) <= 0).length },
    { value: 'payment_pending', label: 'Payment Due', count: events.filter(e => (e.balance_amount || 0) > 0).length }
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

      <EventStats events={events} />

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
    </div>
  );
};

export default EventManagementWithPayments;