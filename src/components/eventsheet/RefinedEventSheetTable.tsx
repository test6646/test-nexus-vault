
import { useState, useEffect } from 'react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Calendar01Icon, Camera01Icon, Video01Icon, Edit02Icon, UserGroupIcon, Location01Icon, DollarCircleIcon, RefreshIcon, DroneIcon } from 'hugeicons-react';
import { Calendar, Edit } from 'lucide-react';
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
          event_staff_assignments(
            staff_id,
            freelancer_id,
            role,
            day_number,
            staff_type
          )
        `)
        .eq('firm_id', profile?.current_firm_id)
        .order('event_date', { ascending: false });

      if (error) throw error;
      
      // Get staff and freelancer details separately
      const eventsWithStaff = await Promise.all(
        (data || []).map(async (event: any) => {
          const staffIds = event.event_staff_assignments
            ?.filter((assignment: any) => assignment.staff_id)
            .map((assignment: any) => assignment.staff_id) || [];
          
          const freelancerIds = event.event_staff_assignments
            ?.filter((assignment: any) => assignment.freelancer_id)
            .map((assignment: any) => assignment.freelancer_id) || [];

          let staffDetails = [];
          let freelancerDetails = [];

          if (staffIds.length > 0) {
            const { data: staff } = await supabase
              .from('profiles')
              .select('user_id, full_name')
              .in('user_id', staffIds);
            staffDetails = staff || [];
          }

          if (freelancerIds.length > 0) {
            const { data: freelancers } = await supabase
              .from('freelancers')
              .select('id, full_name')
              .in('id', freelancerIds);
            freelancerDetails = freelancers || [];
          }

          // Merge staff details back into assignments
          const enrichedAssignments = event.event_staff_assignments?.map((assignment: any) => ({
            ...assignment,
            staff_name: assignment.staff_id 
              ? staffDetails.find((s: any) => s.user_id === assignment.staff_id)?.full_name
              : null,
            freelancer_name: assignment.freelancer_id 
              ? freelancerDetails.find((f: any) => f.id === assignment.freelancer_id)?.full_name
              : null
          })) || [];

          return {
            ...event,
            event_staff_assignments: enrichedAssignments
          };
        })
      );

      setEvents(eventsWithStaff);
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
  const completedEvents = filteredEvents.filter(event => new Date(event.event_date) <= new Date()).length;
  const pendingEvents = filteredEvents.filter(event => new Date(event.event_date) > new Date()).length;

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
                            const cinematographers = staffAssignments.filter((assignment: any) => assignment.role === 'Cinematographer');
                            const dronePilots = staffAssignments.filter((assignment: any) => assignment.role === 'Drone Pilot');
                            const editors = staffAssignments.filter((assignment: any) => assignment.role === 'Editor');

                            return (
                              <>
                                  {photographers.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                      <Camera01Icon className="h-3 w-3" />
                                      <span>
                                        {photographers.map((assignment: any, index: number) => (
                                          <span key={`photographer-${assignment.staff_id || assignment.freelancer_id}-${index}`}>
                                            {assignment.staff_name || assignment.freelancer_name}
                                            {index < photographers.length - 1 && ', '}
                                          </span>
                                        ))}
                                      </span>
                                    </div>
                                  )}
                                  {cinematographers.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                      <Video01Icon className="h-3 w-3" />
                                      <span>
                                        {cinematographers.map((assignment: any, index: number) => (
                                          <span key={`cinematographer-${assignment.staff_id || assignment.freelancer_id}-${index}`}>
                                            {assignment.staff_name || assignment.freelancer_name}
                                            {index < cinematographers.length - 1 && ', '}
                                          </span>
                                        ))}
                                      </span>
                                    </div>
                                  )}
                                  {dronePilots.length > 0 && (
                                     <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                       <DroneIcon className="h-3 w-3" />
                                       <span>
                                        {dronePilots.map((assignment: any, index: number) => (
                                          <span key={`drone-pilot-${assignment.staff_id || assignment.freelancer_id}-${index}`}>
                                            {assignment.staff_name || assignment.freelancer_name}
                                            {index < dronePilots.length - 1 && ', '}
                                          </span>
                                        ))}
                                      </span>
                                    </div>
                                  )}
                                  {editors.length > 0 && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                      <Edit className="h-3 w-3" />
                                      <span>
                                        {editors.map((assignment: any, index: number) => (
                                          <span key={`editor-${assignment.staff_id || assignment.freelancer_id}-${index}`}>
                                            {assignment.staff_name || assignment.freelancer_name}
                                            {index < editors.length - 1 && ', '}
                                          </span>
                                        ))}
                                      </span>
                                    </div>
                                  )}
                                 
                                  {staffAssignments.length === 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      No staff assigned
                                    </div>
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
