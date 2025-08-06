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
      default:
        return 0;
    }
  };

  const EnhancedCrewSection = ({ title, crew, role }: { title: string; crew: StaffAssignment[]; role: string }) => {
    const eventWithQuotation = event as any;
    const totalDays = eventWithQuotation.total_days || 1;
    const hasQuotation = eventWithQuotation.quotation_source_id && eventWithQuotation.quotation_details;
    
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

    // Show section even if no assignments but requirements exist, or if there are any assignments
    if (totalRequired === 0 && totalAssigned === 0 && !hasQuotation) return null;

    return (
      <div className="space-y-3 p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRoleIcon(role, isIncomplete)}
            <h3 className="font-medium text-sm">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isIncomplete ? "destructive" : "secondary"} 
              className="text-xs font-medium"
            >
              {totalAssigned}/{totalRequired}
            </Badge>
            {isIncomplete && (
              <Badge variant="outline" className="text-xs text-destructive border-destructive">
                Incomplete
              </Badge>
            )}
          </div>
        </div>

        {/* Show assignments by day */}
        <div className="space-y-3">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
            const assignments = groupedByDay[day] || [];
            const required = getRequiredCrewCount(role, day);
            
            // Skip days with no requirements and no assignments
            if (required === 0 && assignments.length === 0) return null;
            
            return (
              <div key={day} className="space-y-2">
                {totalDays > 1 && (
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Day {day}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {assignments.length}/{required}
                    </span>
                  </div>
                )}
                
                {assignments.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignments.map((assignment, index) => (
                      <Badge 
                        key={`${assignment.staff_id}-${index}`}
                        variant="secondary"
                        className="text-xs"
                      >
                        {assignment.profiles.full_name}
                      </Badge>
                    ))}
                  </div>
                ) : required > 0 ? (
                  <div className="text-xs text-muted-foreground italic p-2 bg-muted/50 rounded">
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            Crew & Tasks
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <div className="animate-pulse flex items-center justify-center gap-2">
              <div className="w-4 h-4 bg-primary/20 rounded-full animate-bounce"></div>
              <span>Loading crew information...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Crew Members Section - Horizontal 3 Column Layout */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  Crew Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Primary Staff from Event */}
                 {(event.photographer || event.cinematographer || event.editor || event.drone_pilot) && (
                   <div className="space-y-4">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {event.photographer && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-2">
                            <Camera02Icon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Photographer</span>
                          </div>
                          <Badge className={getRoleColor('Photographer')}>
                            {event.photographer.full_name}
                          </Badge>
                        </div>
                      )}
                      
                      {event.cinematographer && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-2">
                            <VideoReplayIcon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Cinematographer</span>
                          </div>
                          <Badge className={getRoleColor('Cinematographer')}>
                            {event.cinematographer.full_name}
                          </Badge>
                        </div>
                      )}

                      {event.drone_pilot && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                           <div className="flex items-center gap-2">
                             <DroneIcon className="h-4 w-4 text-primary" />
                             <span className="text-sm font-medium">Drone Pilot</span>
                           </div>
                          <Badge className={getRoleColor('Drone Pilot')}>
                            {event.drone_pilot.full_name}
                          </Badge>
                        </div>
                      )}
                      
                      {event.editor && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <div className="flex items-center gap-2">
                            <AdobePremierIcon className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Editor</span>
                          </div>
                          <Badge className={getRoleColor('Editor')}>
                            {event.editor.full_name}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dynamic Staff Assignments - 3 Column Grid */}
                {/* Always show crew sections if event has quotation or has assignments */}
                {((event as any).quotation_source_id || staffAssignments.length > 0) && (
                  <>
                    <Separator />
                     <div className="space-y-4">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <EnhancedCrewSection title="Photographers" crew={photographers} role="Photographer" />
                        <EnhancedCrewSection title="Cinematographers" crew={cinematographers} role="Cinematographer" />
                        <EnhancedCrewSection title="Drone Pilots" crew={dronePilots} role="Drone Pilot" />
                        <EnhancedCrewSection title="Editors" crew={editors} role="Editor" />
                      </div>
                    </div>
                  </>
                )}

                {!event.photographer && !event.cinematographer && !event.editor && !event.drone_pilot && staffAssignments.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    <UserIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No crew members assigned to this event.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Tasks Section - Separate Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckmarkCircle02Icon className="h-5 w-5" />
                  Event Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventTasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {eventTasks.map((task) => (
                      <div key={task.id} className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <h5 className="font-medium text-sm leading-tight">{task.title}</h5>
                          <div className="flex flex-col gap-1 ml-2">
                            <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
                              {task.status}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-3 w-3" />
                            <span>{task.assignee?.full_name || 'Unassigned'}</span>
                          </div>
                          {task.due_date && (
                            <div className="flex items-center gap-2">
                              <Calendar03Icon className="h-3 w-3" />
                              <span>{new Date(task.due_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    <CheckmarkCircle02Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No tasks assigned to this event.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EventCrewDialog;
