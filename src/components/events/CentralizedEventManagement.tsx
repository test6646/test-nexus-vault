import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Add01Icon, RefreshIcon } from 'hugeicons-react';
import { CalendarIcon } from 'lucide-react';
import { useCentralizedEvents, CentralizedEvent } from '@/hooks/useCentralizedEvents';
import UnifiedSearchFilter from '@/components/common/UnifiedSearchFilter';
import { PageSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import CentralizedEventCard from './CentralizedEventCard';
import CentralizedEventDialog from './CentralizedEventDialog';
import CentralizedPaymentDialog from './CentralizedPaymentDialog';

const CentralizedEventManagement = () => {
  const { events, loading, loadEvents, saveEvent, recordPayment, deleteEvent } = useCentralizedEvents();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('event_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CentralizedEvent | null>(null);
  const [paymentEvent, setPaymentEvent] = useState<CentralizedEvent | null>(null);

  const handleRefresh = async () => {
    await loadEvents();
    toast({
      title: "Events refreshed",
      description: "Event data has been updated successfully.",
    });
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    const searchRegex = new RegExp(searchTerm, 'i');
    const searchMatch = searchRegex.test(event.title) || 
                       searchRegex.test(event.event_type) ||
                       searchRegex.test(event.client_name || '') ||
                       searchRegex.test(event.venue || '');
    
    let statusMatch = true;
    if (statusFilter === 'confirmed') {
      statusMatch = event.total_amount > 0;
    } else if (statusFilter === 'completed') {
      statusMatch = event.event_status === 'completed';
    } else if (statusFilter === 'pending') {
      statusMatch = event.event_status === 'upcoming';
    } else if (statusFilter === 'paid') {
      statusMatch = event.payment_status === 'paid';
    } else if (statusFilter === 'payment_pending') {
      statusMatch = event.payment_status !== 'paid';
    } else if (statusFilter === 'crew_incomplete') {
      statusMatch = !event.crew_complete;
    }
    
    return searchMatch && statusMatch;
  });

  // Sort events
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const direction = sortDirection === 'asc' ? 1 : -1;
    
    if (sortBy === 'event_date') {
      return direction * (new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
    } else if (sortBy === 'title') {
      return direction * a.title.localeCompare(b.title);
    } else if (sortBy === 'total_amount') {
      return direction * (a.total_amount - b.total_amount);
    } else if (sortBy === 'balance_amount') {
      return direction * (a.balance_amount - b.balance_amount);
    }
    
    return 0;
  });

  // Status filters with counts
  const statusFilters = [
    { value: 'confirmed', label: 'Confirmed', count: events.filter(e => e.total_amount > 0).length },
    { value: 'completed', label: 'Completed', count: events.filter(e => e.event_status === 'completed').length },
    { value: 'pending', label: 'Work Pending', count: events.filter(e => e.event_status === 'upcoming').length },
    { value: 'crew_incomplete', label: 'Staff Incomplete', count: events.filter(e => !e.crew_complete).length },
    { value: 'paid', label: 'Paid', count: events.filter(e => e.payment_status === 'paid').length },
    { value: 'payment_pending', label: 'Payment Due', count: events.filter(e => e.payment_status !== 'paid').length }
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
            className="rounded-full p-3"
          >
            <RefreshIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border p-3">
          <div className="text-2xl font-bold text-primary">{events.length}</div>
          <p className="text-xs text-muted-foreground">Total Events</p>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-2xl font-bold text-green-600">
            ₹{events.reduce((sum, e) => sum + e.total_paid, 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-2xl font-bold text-orange-600">
            ₹{events.reduce((sum, e) => sum + e.balance_amount, 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">Pending Amount</p>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-2xl font-bold text-red-600">
            {events.filter(e => !e.crew_complete).length}
          </div>
          <p className="text-xs text-muted-foreground">Incomplete Crew</p>
        </div>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedEvents.map((event) => (
            <CentralizedEventCard
              key={event.id}
              event={event}
              onEdit={(event) => setEditingEvent(event)}
              onPayment={(event) => setPaymentEvent(event)}
              onDelete={deleteEvent}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <CentralizedEventDialog
        open={createDialogOpen || !!editingEvent}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingEvent(null);
          }
        }}
        event={editingEvent}
        onSave={saveEvent}
      />

      <CentralizedPaymentDialog
        open={!!paymentEvent}
        onOpenChange={(open) => {
          if (!open) setPaymentEvent(null);
        }}
        event={paymentEvent}
        onPayment={recordPayment}
      />
    </div>
  );
};

export default CentralizedEventManagement;