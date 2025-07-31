
import { useState, useEffect } from 'react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Calendar01Icon, Camera01Icon, Video01Icon, Edit02Icon, UserGroupIcon, Location01Icon, DollarCircleIcon, RefreshIcon } from 'hugeicons-react';
import { Calendar } from 'lucide-react';
import { formatEventDateRange } from '@/lib/date-utils';
import UnifiedSearchFilter from '@/components/common/UnifiedSearchFilter';
import StatsGrid from '@/components/ui/stats-grid';
import { Event } from '@/types/studio';
import { EmptyState } from '@/components/ui/empty-state';

const RefinedEventSheetTable = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
          client:clients(name),
          photographer:profiles!events_photographer_id_fkey(full_name),
          videographer:profiles!events_videographer_id_fkey(full_name),
          editor:profiles!events_editor_id_fkey(full_name),
          event_staff_assignments(
            staff_id,
            role,
            day_number,
            profiles(full_name)
          )
        `)
        .eq('firm_id', profile?.current_firm_id)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data as any || []);
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

  const getEventTypeColor = (eventType: string) => {
    const colors = {
      'Wedding': 'bg-pink-100 text-pink-800',
      'Pre-Wedding': 'bg-purple-100 text-purple-800',
      'Ring-Ceremony': 'bg-yellow-100 text-yellow-800',
      'Maternity Photography': 'bg-green-100 text-green-800',
      'Others': 'bg-gray-100 text-gray-800'
    };
    return colors[eventType as keyof typeof colors] || colors.Others;
  };

  const getEventStatusBadge = (eventDate: string, eventEndDate?: string) => {
    const today = new Date();
    const startDate = new Date(eventDate);
    const endDate = eventEndDate ? new Date(eventEndDate) : startDate;
    
    // If date range contains today
    if (today >= startDate && today <= endDate) {
      return { label: 'In Progress', color: 'bg-blue-100 text-blue-800' };
    }
    
    // If date is gone
    if (today > endDate) {
      return { label: 'Completed', color: 'bg-green-100 text-green-800' };
    }
    
    // If event is coming in 1 week
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    if (startDate <= oneWeekFromNow) {
      return { label: 'Upcoming', color: 'bg-yellow-100 text-yellow-800' };
    }
    
    // If farther than a week
    return { label: 'Pending', color: 'bg-gray-100 text-gray-800' };
  };

  const handleRefreshData = async () => {
    await loadEvents();
    toast({
      title: "Data Refreshed",
      description: "Event data has been updated",
    });
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.venue?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalEvents = filteredEvents.length;
  const totalRevenue = filteredEvents.reduce((sum, event) => sum + (event.total_amount || 0), 0);
  const completedEvents = filteredEvents.filter(event => event.photo_editing_status && event.video_editing_status).length;
  const pendingEvents = filteredEvents.filter(event => !event.photo_editing_status || !event.video_editing_status).length;

  if (loading) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Event Statistics */}
      <StatsGrid stats={[
        {
          title: "Total Events",
          value: totalEvents,
          icon: <Calendar01Icon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        },
        {
          title: "Total Revenue",
          value: `₹${totalRevenue.toLocaleString()}`,
          icon: <DollarCircleIcon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        },
        {
          title: "Completed",
          value: completedEvents,
          icon: <Camera01Icon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        },
        {
          title: "In Progress",
          value: pendingEvents,
          icon: <Video01Icon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        }
      ]} />

      {/* Search and Filters */}
      <UnifiedSearchFilter
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilters={[
          { value: 'upcoming', label: 'Upcoming', count: events.filter(e => new Date(e.event_date) > new Date()).length },
          { value: 'completed', label: 'Completed', count: events.filter(e => new Date(e.event_date) <= new Date()).length },
          { value: 'photo_pending', label: 'Photo Editing Pending', count: events.filter(e => !e.photo_editing_status).length },
          { value: 'video_pending', label: 'Video Editing Pending', count: events.filter(e => !e.video_editing_status).length }
        ]}
        selectedStatus={statusFilter}
        onStatusChange={setStatusFilter}
        sortOptions={[
          { value: 'event_date', label: 'Event Date' },
          { value: 'title', label: 'Title' },
          { value: 'client_name', label: 'Client Name' }
        ]}
        selectedSort="event_date"
        onSortChange={() => {}}
        placeholder="Search events by title, client, or venue..."
        className="mb-6"
      />

      {/* Events Table */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={events.length === 0 ? 'No Events Yet' : 'No Events Found'}
          description={events.length === 0 
            ? 'Start tracking your studio events by creating your first event.'
            : 'No events match your current search criteria. Try adjusting your filters or search terms.'
          }
          action={events.length === 0 ? {
            label: "Create Event",
            onClick: () => window.location.href = '/events'
          } : undefined}
        />
      ) : (
        <Card className="rounded-2xl border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Details</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  const eventStatus = getEventStatusBadge(event.event_date, (event as any).event_end_date);
                  return (
                    <TableRow key={event.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{event.title}</div>
                           {event.venue && (
                             <div className="text-sm text-muted-foreground">
                               {event.venue}
                             </div>
                           )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {event.client?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatEventDateRange(event.event_date, (event as any).total_days, (event as any).event_end_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getEventTypeColor(event.event_type)}>
                          {event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(() => {
                            const staffAssignments = (event as any).event_staff_assignments || [];
                            const photographers = staffAssignments.filter((assignment: any) => assignment.role === 'Photographer');
                            const videographers = staffAssignments.filter((assignment: any) => assignment.role === 'Videographer');
                            const editors = staffAssignments.filter((assignment: any) => assignment.role === 'Editor');

                            return (
                              <>
                                 {photographers.length > 0 && (
                                   <div className="text-xs text-muted-foreground">
                                      {photographers.map((assignment: any, index: number) => (
                                        <span key={`photographer-${assignment.staff_id}-${index}`}>
                                          {assignment.profiles?.full_name}
                                          {index < photographers.length - 1 && ', '}
                                        </span>
                                      ))}
                                   </div>
                                 )}
                                 {videographers.length > 0 && (
                                   <div className="text-xs text-muted-foreground">
                                      {videographers.map((assignment: any, index: number) => (
                                        <span key={`videographer-${assignment.staff_id}-${index}`}>
                                          {assignment.profiles?.full_name}
                                          {index < videographers.length - 1 && ', '}
                                        </span>
                                      ))}
                                   </div>
                                 )}
                                 {editors.length > 0 && (
                                   <div className="text-xs text-muted-foreground">
                                      {editors.map((assignment: any, index: number) => (
                                        <span key={`editor-${assignment.staff_id}-${index}`}>
                                          {assignment.profiles?.full_name}
                                          {index < editors.length - 1 && ', '}
                                        </span>
                                      ))}
                                   </div>
                                 )}
                                
                                {/* Fallback to old method if no staff assignments found */}
                                {staffAssignments.length === 0 && (
                                  <>
                                     {event.photographer && (
                                       <div className="text-xs text-muted-foreground">
                                         {event.photographer.full_name}
                                       </div>
                                     )}
                                     {event.videographer && (
                                       <div className="text-xs text-muted-foreground">
                                         {event.videographer.full_name}
                                       </div>
                                     )}
                                     {event.editor && (
                                       <div className="text-xs text-muted-foreground">
                                         {event.editor.full_name}
                                       </div>
                                     )}
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={eventStatus.color}>
                          {eventStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {event.total_amount ? `₹${event.total_amount.toLocaleString()}` : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RefinedEventSheetTable;
