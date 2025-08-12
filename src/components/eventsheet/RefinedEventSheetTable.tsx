
import { useState, useEffect } from 'react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getEventTypeColors } from '@/lib/status-colors';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Calendar01Icon, Camera01Icon, Video01Icon, Edit02Icon, UserGroupIcon, Location01Icon, DollarCircleIcon, RefreshIcon, DroneIcon } from 'hugeicons-react';
import { Calendar, Edit } from 'lucide-react';
import { formatEventDateRange } from '@/lib/date-utils';
import StatsGrid from '@/components/ui/stats-grid';
import { Event } from '@/types/studio';
import { EmptyState } from '@/components/ui/empty-state';

const RefinedEventSheetTable = () => {
  const { currentFirmId } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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
          client:clients(name),
          event_staff_assignments(
            staff_id,
            freelancer_id,
            role,
            day_number,
            staff_type
          )
        `)
        .eq('firm_id', currentFirmId)
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
      'Wedding': 'text-red-600',
      'Pre-Wedding': 'text-pink-600',
      'Ring-Ceremony': 'text-purple-600',
      'Maternity Photography': 'text-blue-600',
      'Others': 'text-gray-600'
    };
    return colors[eventType as keyof typeof colors] || colors.Others;
  };

  const getEventStatusColor = (eventDate: string, eventEndDate?: string) => {
    const today = new Date();
    const startDate = new Date(eventDate);
    const endDate = eventEndDate ? new Date(eventEndDate) : startDate;
    
    // If date range contains today
    if (today >= startDate && today <= endDate) {
      return { label: 'In Progress', color: 'text-blue-600' };
    }
    
    // If date is gone
    if (today > endDate) {
      return { label: 'Completed', color: 'text-green-600' };
    }
    
    // If event is coming in 1 week
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(today.getDate() + 7);
    
    if (startDate <= oneWeekFromNow) {
      return { label: 'Upcoming', color: 'text-yellow-600' };
    }
    
    // If farther than a week
    return { label: 'Pending', color: 'text-gray-600' };
  };

  const handleRefreshData = async () => {
    await loadEvents();
    toast({
      title: "Data Refreshed",
      description: "Event data has been updated",
    });
  };

  // Show all events without filtering
  const eventsToShow = events;

  const totalEvents = eventsToShow.length;
  const totalRevenue = eventsToShow.reduce((sum, event) => sum + (event.total_amount || 0), 0);
  const completedEvents = eventsToShow.filter(event => new Date(event.event_date) <= new Date()).length;
  const pendingEvents = eventsToShow.filter(event => new Date(event.event_date) > new Date()).length;

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


      {/* Events Table */}
      {eventsToShow.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Events Found"
          description="Create your first event to start managing your photography business."
          action={{
            label: "Create Event",
            onClick: () => window.location.href = '/events'
          }}
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <Card className="hidden lg:block rounded-2xl border-gray-200">
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
                  {eventsToShow.map((event) => {
                    const eventStatus = getEventStatusColor(event.event_date, (event as any).event_end_date);
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
                          <span className={`font-medium ${getEventTypeColors(event.event_type)}`}>
                            {event.event_type}
                          </span>
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
                                          {photographers
                                            .map((a: any) => (a.staff_name || a.freelancer_name || '').trim())
                                            .filter((n: string) => n.length > 0)
                                            .filter((n: string, i: number, arr: string[]) => arr.indexOf(n) === i)
                                            .join(', ')}
                                        </span>
                                      </div>
                                    )}
                                    {cinematographers.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                        <Video01Icon className="h-3 w-3" />
                                        <span>
                                          {cinematographers
                                            .map((a: any) => (a.staff_name || a.freelancer_name || '').trim())
                                            .filter((n: string) => n.length > 0)
                                            .filter((n: string, i: number, arr: string[]) => arr.indexOf(n) === i)
                                            .join(', ')}
                                        </span>
                                      </div>
                                    )}
                                    {dronePilots.length > 0 && (
                                       <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                         <DroneIcon className="h-3 w-3" />
                                         <span>
                                           {dronePilots
                                             .map((a: any) => (a.staff_name || a.freelancer_name || '').trim())
                                             .filter((n: string) => n.length > 0)
                                             .filter((n: string, i: number, arr: string[]) => arr.indexOf(n) === i)
                                             .join(', ')}
                                         </span>
                                      </div>
                                    )}
                                    {editors.length > 0 && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                        <Edit className="h-3 w-3" />
                                         <span>
                                           {editors
                                             .map((a: any) => (a.staff_name || a.freelancer_name || '').trim())
                                             .filter((n: string) => n.length > 0)
                                             .filter((n: string, i: number, arr: string[]) => arr.indexOf(n) === i)
                                             .join(', ')}
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
                          <span className={`text-sm font-medium ${eventStatus.color}`}>
                            {eventStatus.label}
                          </span>
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

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {events.map((event) => {
              const eventStatus = getEventStatusColor(event.event_date, (event as any).event_end_date);
              const staffAssignments = (event as any).event_staff_assignments || [];
              return (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-bold text-foreground">
                            {event.title}
                          </span>
                          <Badge variant="secondary" className={`text-xs ${eventStatus.color}`}>
                            {eventStatus.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.client?.name || '~'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {event.total_amount ? `₹${event.total_amount.toLocaleString()}` : '~'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                      <div>
                        <div className="text-xs text-muted-foreground">Date</div>
                        <div className="text-sm font-medium">
                          {formatEventDateRange(event.event_date, (event as any).total_days, (event as any).event_end_date)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Type</div>
                        <span className={`font-medium ${getEventTypeColors(event.event_type)}`}>
                          {event.event_type}
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Venue</div>
                        <div className="text-sm font-medium">
                          {event.venue || '~'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Staff</div>
                        <div className="text-sm font-medium">
                          {staffAssignments.length > 0 ? `${staffAssignments.length} assigned` : '~'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default RefinedEventSheetTable;
