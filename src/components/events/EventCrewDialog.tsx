import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Camera02Icon, VideoReplayIcon, AdobePremierIcon, UserIcon, CheckmarkCircle02Icon, Clock03Icon, Calendar03Icon, DroneIcon } from 'hugeicons-react';
import { Event } from '@/types/studio';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EventCrewDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StaffAssignment {
  staff_id: string;
  role: string;
  day_number: number;
  staff_type: string;
  profiles: {
    full_name: string;
  };
}

interface EventTask {
  id: string;
  title: string;
  status: string;
  assigned_to: string;
  priority: string;
  due_date: string | null;
  assignee: {
    full_name: string;
  } | null;
}

const EventCrewDialog = ({ event, open, onOpenChange }: EventCrewDialogProps) => {
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [eventTasks, setEventTasks] = useState<EventTask[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && event) {
      loadData();
    }
  }, [open, event]);

  const loadData = async () => {
    if (!event) return;
    
    setLoading(true);
    try {
      // Load staff assignments and tasks in parallel
      const [staffResponse, tasksResponse] = await Promise.all([
        supabase
          .from('event_staff_assignments')
          .select(`
            *,
            staff:profiles(id, full_name, role),
            freelancer:freelancers(id, full_name, role)
          `)
          .eq('event_id', event.id)
          .order('day_number'),
        
        supabase
          .from('tasks')
          .select(`
            id,
            title,
            status,
            assigned_to,
            priority,
            due_date,
            assignee:profiles!tasks_assigned_to_fkey(full_name)
          `)
          .eq('event_id', event.id)
          .order('created_at')
      ]);

      if (staffResponse.error) {
        console.error('Error loading staff assignments:', staffResponse.error);
      } else {
        // Process staff assignments
        const processedAssignments = (staffResponse.data || []).map((assignment: any) => {
          const staffInfo = assignment.staff || assignment.freelancer;
          const assigneeId = assignment.staff_id || assignment.freelancer_id;
          const staffType = assignment.staff_id ? 'staff' : 'freelancer';
          
          return {
            staff_id: assigneeId,
            role: assignment.role,
            day_number: assignment.day_number,
            staff_type: staffType,
            profiles: {
              full_name: staffInfo?.full_name || 'Unknown'
            }
          };
        });
        setStaffAssignments(processedAssignments);
      }

      if (tasksResponse.error) {
        console.error('Error loading tasks:', tasksResponse.error);
      } else {
        setEventTasks(tasksResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const getCrewByRole = (role: string) => {
    return staffAssignments.filter(assignment => assignment.role === role);
  };

  const photographers = getCrewByRole('Photographer');
  const cinematographers = getCrewByRole('Cinematographer');
  const dronePilots = getCrewByRole('Drone Pilot');
  const editors = getCrewByRole('Editor');

  const getRoleIcon = (role: string, isIncomplete = false) => {
    const iconClass = isIncomplete ? "h-4 w-4 text-red-500" : "h-4 w-4 text-primary";
    
    switch (role) {
      case 'Photographer':
        return <Camera02Icon className={iconClass} />;
      case 'Cinematographer':
        return <VideoReplayIcon className={iconClass} />;
      case 'Drone Pilot':
        return <DroneIcon className={iconClass} />;
      case 'Editor':
        return <AdobePremierIcon className={iconClass} />;
      default:
        return <UserIcon className={iconClass} />;
    }
  };

  const getRoleColor = (role: string) => {
    // Use consistent primary color for all crew members
    return 'bg-primary/10 text-primary border-primary/20';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRequiredCrewCount = (role: string, day: number = 1) => {
    const eventWithQuotation = event as any;
    if (!eventWithQuotation.quotation_details?.days) return 0;
    
    const dayConfig = eventWithQuotation.quotation_details.days[day - 1];
    if (!dayConfig) return 0;
    
    switch (role) {
      case 'Photographer':
        return dayConfig.photographers || 0;
      case 'Cinematographer':
        return dayConfig.cinematographers || 0;
      case 'Drone Pilot':
        return dayConfig.drone || 0;
      case 'Editor':
        // Only count editors if same day editing is enabled in quotation
        return eventWithQuotation.quotation_details?.sameDayEditing ? 1 : 0;
      default:
        return 0;
    }
  };

  const EnhancedCrewSection = ({ title, crew, role }: { title: string; crew: StaffAssignment[]; role: string }) => {
    const eventWithQuotation = event as any;
    const totalDays = eventWithQuotation.total_days || 1;
    const hasQuotation = eventWithQuotation.quotation_source_id || eventWithQuotation.quotation_details;
    
    const groupedByDay = crew.reduce((acc, assignment) => {
      if (!acc[assignment.day_number]) {
        acc[assignment.day_number] = [];
      }
      acc[assignment.day_number].push(assignment);
      return acc;
    }, {} as Record<number, StaffAssignment[]>);

    // Calculate overall completeness for this role
    let totalRequired = 0;
    let totalAssigned = 0;
    let isIncomplete = false;

    for (let day = 1; day <= totalDays; day++) {
      const required = getRequiredCrewCount(role, day);
      const assigned = groupedByDay[day]?.length || 0;
      totalRequired += required;
      totalAssigned += assigned;
      if (assigned < required) {
        isIncomplete = true;
      }
    }

    // Only show roles that are required by quotation (>0) or have existing assignments
    if (totalRequired === 0 && totalAssigned === 0) return null;

    return (
      <div className="bg-gradient-to-br from-background to-muted/20 rounded-xl border border-border/50 p-4 space-y-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRoleIcon(role, isIncomplete)}
            <div>
              <h3 className="font-semibold text-sm text-foreground">{title}</h3>
              {hasQuotation && totalRequired > 0 && (
                <p className="text-xs text-muted-foreground">Required by quotation</p>
              )}
            </div>
          </div>
          <Badge 
            variant={isIncomplete ? "destructive" : "secondary"} 
            className={`text-xs font-medium px-2 py-1 ${isIncomplete ? 'text-red-500 bg-red-50 border-red-200' : ''}`}
          >
            {totalAssigned}/{totalRequired || 'N/A'}
          </Badge>
        </div>

        {/* Show assignments by day */}
        <div className="space-y-3">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
            const assignments = groupedByDay[day] || [];
            const required = getRequiredCrewCount(role, day);
            
            // For quotation events, show even empty requirements
            if (!hasQuotation && required === 0 && assignments.length === 0) return null;
            
            return (
              <div key={day} className="space-y-2">
                {totalDays > 1 && (
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <Badge variant="outline" className="text-xs font-medium">
                      Day {day}
                    </Badge>
                    <span className={`text-xs font-medium ${
                      assignments.length < required ? 'text-destructive' : 
                      assignments.length === required && required > 0 ? 'text-green-600' : 
                      'text-muted-foreground'
                    }`}>
                      {assignments.length}/{required || 'N/A'}
                    </span>
                  </div>
                )}
                
                {assignments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignments.map((assignment, index) => (
                      <Badge 
                        key={`${assignment.staff_id}-${index}`}
                        variant="secondary"
                        className="text-xs bg-primary/10 text-primary border-primary/20"
                      >
                        {assignment.profiles.full_name}
                      </Badge>
                    ))}
                  </div>
                ) : hasQuotation && required > 0 ? (
                  <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded-lg">
                    No crew assigned
                  </div>
                ) : !hasQuotation && assignments.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded-lg">
                    No crew assigned
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const eventWithQuotation = event as any;
  const hasQuotation = eventWithQuotation.quotation_source_id || eventWithQuotation.quotation_details;
  const isManualEvent = !hasQuotation;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <UserIcon className="h-6 w-6 text-primary" />
            Crew & Tasks
            {hasQuotation && (
              <Badge variant="secondary" className="text-xs">
                Quotation-based Event
              </Badge>
            )}
            {isManualEvent && (
              <Badge variant="outline" className="text-xs">
                Manual Event
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-primary/20 rounded-full"></div>
                <div className="w-6 h-6 bg-primary/40 rounded-full"></div>
                <div className="w-6 h-6 bg-primary/60 rounded-full"></div>
              </div>
              <p className="text-sm text-muted-foreground">Loading crew information...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Crew Members Section */}
            <div className="bg-gradient-to-r from-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm">
              <div className="p-3 sm:p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserIcon className="h-6 w-6 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold">Crew Members</h2>
                      {isManualEvent ? (
                        <p className="text-sm text-muted-foreground">No crew members are pre-decided for this manual event</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Based on quotation requirements</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                {/* Primary Staff from Event */}
                {(event.photographer || event.cinematographer || event.editor || event.drone_pilot) && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Primary Staff</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {event.photographer && (
                        <div className="bg-gradient-to-br from-background to-primary/5 rounded-lg p-4 border border-primary/10">
                          <div className="flex items-center gap-3 mb-2">
                            <Camera02Icon className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Photographer</span>
                          </div>
                          <p className="font-semibold text-foreground">{event.photographer.full_name}</p>
                        </div>
                      )}
                      
                      {event.cinematographer && (
                        <div className="bg-gradient-to-br from-background to-primary/5 rounded-lg p-4 border border-primary/10">
                          <div className="flex items-center gap-3 mb-2">
                            <VideoReplayIcon className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Cinematographer</span>
                          </div>
                          <p className="font-semibold text-foreground">{event.cinematographer.full_name}</p>
                        </div>
                      )}

                      {event.drone_pilot && (
                        <div className="bg-gradient-to-br from-background to-primary/5 rounded-lg p-4 border border-primary/10">
                          <div className="flex items-center gap-3 mb-2">
                            <DroneIcon className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Drone Pilot</span>
                          </div>
                          <p className="font-semibold text-foreground">{event.drone_pilot.full_name}</p>
                        </div>
                      )}
                      
                      {event.editor && (
                        <div className="bg-gradient-to-br from-background to-primary/5 rounded-lg p-4 border border-primary/10">
                          <div className="flex items-center gap-3 mb-2">
                            <AdobePremierIcon className="h-5 w-5 text-primary" />
                            <span className="text-sm font-medium text-muted-foreground">Editor</span>
                          </div>
                          <p className="font-semibold text-foreground">{event.editor.full_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dynamic Staff Assignments */}
                {(hasQuotation || staffAssignments.length > 0) && (
                  <div className="space-y-4">
                    {(event.photographer || event.cinematographer || event.editor || event.drone_pilot) && (
                      <Separator className="my-6" />
                    )}
                    <h3 className="text-lg font-semibold text-foreground">Crew Assignments</h3>
                    <div className="space-y-4">
                      <EnhancedCrewSection title="Photographers" crew={photographers} role="Photographer" />
                      <EnhancedCrewSection title="Cinematographers" crew={cinematographers} role="Cinematographer" />
                      <EnhancedCrewSection title="Drone Pilots" crew={dronePilots} role="Drone Pilot" />
                      <EnhancedCrewSection title="Editors" crew={editors} role="Editor" />
                    </div>
                  </div>
                )}

                {/* No crew assigned state */}
                {!event.photographer && !event.cinematographer && !event.editor && !event.drone_pilot && staffAssignments.length === 0 && !hasQuotation && (
                  <div className="text-center py-12">
                    <UserIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Crew Members Pre-decided</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      This is a manual event. You can assign crew members by editing the event and selecting staff for each role.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Event Tasks Section */}
            <div className="bg-gradient-to-r from-background to-muted/10 rounded-xl border border-border/50 backdrop-blur-sm">
              <div className="p-3 sm:p-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <CheckmarkCircle02Icon className="h-6 w-6 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold">Event Tasks</h2>
                    <p className="text-sm text-muted-foreground">Tasks associated with this event</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 sm:p-6">
                {eventTasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {eventTasks.map((task) => (
                      <div key={task.id} className="bg-gradient-to-br from-background to-muted/20 rounded-lg border border-border/50 p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <h5 className="font-semibold text-sm leading-tight text-foreground">{task.title}</h5>
                          <div className="flex flex-col gap-1 ml-2">
                            <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
                              {task.status}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <UserIcon className="h-3 w-3" />
                            <span>{task.assignee?.full_name || 'Unassigned'}</span>
                          </div>
                          {task.due_date && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar03Icon className="h-3 w-3" />
                              <span>{new Date(task.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckmarkCircle02Icon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks Assigned</h3>
                    <p className="text-sm text-muted-foreground">
                      No tasks have been assigned to this event yet.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventCrewDialog;
