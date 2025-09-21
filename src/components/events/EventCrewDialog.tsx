import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { 
  UserGroupIcon,
  Camera02Icon, 
  VideoReplayIcon, 
  AdobePremierIcon, 
  DroneIcon,
  CheckmarkCircle02Icon, 
  Clock03Icon, 
  Calendar03Icon,
  UserIcon,
  Loading03Icon
} from 'hugeicons-react';
import { Event } from '@/types/studio';
import { supabase } from '@/integrations/supabase/client';
import { getStatusColors } from '@/lib/status-colors';

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
  task_type: string;
  freelancer_id?: string;
  assigned_staff: {
    full_name: string;
  } | null;
  freelancer: {
    full_name: string;
  } | null;
}

const EventCrewDialog = ({ event, open, onOpenChange }: EventCrewDialogProps) => {
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [eventTasks, setEventTasks] = useState<EventTask[]>([]);
  const [quotationDetails, setQuotationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && event) {
      loadData();
    } else {
      // Reset state when dialog closes
      setQuotationDetails(null);
    }
  }, [open, event]);

  const loadData = async () => {
    if (!event) return;
    
    setLoading(true);
    try {
      // Load staff assignments, tasks, and quotation details in parallel
      const promises = [
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
            freelancer_id,
            priority,
            due_date,
            task_type,
            assigned_staff:profiles!tasks_assigned_to_fkey(full_name),
            freelancer:freelancers(full_name)
          `)
          .eq('event_id', event.id)
          .order('created_at')
      ];

      // Add quotation details fetch if event has quotation_source_id
      const eventWithQuotation = event as any;
      let quotationPromise = null;
      if (eventWithQuotation.quotation_source_id) {
        quotationPromise = supabase
          .from('quotations')
          .select('quotation_details')
          .eq('id', eventWithQuotation.quotation_source_id)
          .single();
        promises.push(quotationPromise);
      }

      const results = await Promise.all(promises);
      const [staffResponse, tasksResponse, quotationResponse] = results;

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
        // Transform the data to match the interface
        const transformedTasks = (tasksResponse.data || []).map((task: any) => ({
          ...task,
          assigned_staff: task.assigned_staff ? { full_name: task.assigned_staff.full_name } : null,
          freelancer: task.freelancer ? { full_name: task.freelancer.full_name } : null
        }));
        setEventTasks(transformedTasks);
      }

      // Store quotation details for calculations
      if (quotationResponse && !quotationResponse.error && quotationResponse.data) {
        setQuotationDetails((quotationResponse.data as any).quotation_details);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!event) return null;

  const eventWithQuotation = event as any;
  const totalDays = eventWithQuotation.total_days || 1;
  const hasQuotation = eventWithQuotation.quotation_source_id || quotationDetails;

  // Group assignments by day and role
  const groupedAssignments = staffAssignments.reduce((acc, assignment) => {
    const day = assignment.day_number;
    const role = assignment.role;
    
    if (!acc[day]) acc[day] = {};
    if (!acc[day][role]) acc[day][role] = [];
    
    acc[day][role].push(assignment);
    return acc;
  }, {} as Record<number, Record<string, StaffAssignment[]>>);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Loading03Icon className="h-8 w-8 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading crew and task information...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[700px] h-[70vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <UserGroupIcon className="h-4 w-4 text-primary" />
            <span className="text-sm sm:text-base font-semibold truncate">
              {event.title} - Crew & Tasks
            </span>
            {hasQuotation && (
              <Badge variant="secondary" className="text-xs">
                Quotation
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Primary Staff Section */}
          {(event.photographer || event.cinematographer || event.editor || event.drone_pilot) && (
            <div className="bg-muted/30 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Primary Staff
              </h3>
              <div className="grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm">
                {event.photographer && (
                  <div className="flex items-start gap-2">
                    <Camera02Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                      <span className="text-muted-foreground flex-shrink-0">Photographer:</span>
                      <span className="font-medium break-words">{event.photographer.full_name}</span>
                    </div>
                  </div>
                )}
                
                {event.cinematographer && (
                  <div className="flex items-start gap-2">
                    <VideoReplayIcon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                      <span className="text-muted-foreground flex-shrink-0">Cinematographer:</span>
                      <span className="font-medium break-words">{event.cinematographer.full_name}</span>
                    </div>
                  </div>
                )}

                {event.drone_pilot && (
                  <div className="flex items-start gap-2">
                    <DroneIcon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                      <span className="text-muted-foreground flex-shrink-0">Drone Pilot:</span>
                      <span className="font-medium break-words">{event.drone_pilot.full_name}</span>
                    </div>
                  </div>
                )}
                
                {event.editor && (
                  <div className="flex items-start gap-2">
                    <AdobePremierIcon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                      <span className="text-muted-foreground flex-shrink-0">Editor:</span>
                      <span className="font-medium break-words">{event.editor.full_name}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Crew Assignments & Stats - EXACTLY LIKE FINANCIAL SUMMARY */}
          {(staffAssignments.length > 0 || hasQuotation) && (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Crew Assignments & Stats
              </h3>
              
              {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                const dayAssignments = groupedAssignments[day] || {};
                const hasAssignments = Object.keys(dayAssignments).length > 0;
                
                if (!hasAssignments && !hasQuotation) return null;

                // Calculate required vs assigned counts from quotation details
                const roles = ['Photographer', 'Cinematographer', 'Drone Pilot', 'Same Day Editor'];
                const getAssignedCount = (role: string) => dayAssignments[role]?.length || 0;
                const getRequiredCount = (role: string) => {
                  if (hasQuotation && quotationDetails?.days) {
                    const dayConfig = quotationDetails.days[day - 1];
                    if (dayConfig) {
                      switch (role) {
                        case 'Photographer': return dayConfig.photographers || 0;
                        case 'Cinematographer': return dayConfig.cinematographers || 0;
                        case 'Drone Pilot': return dayConfig.drone || 0;
                        case 'Same Day Editor': return dayConfig.sameDayEditors || (quotationDetails?.sameDayEditing ? 1 : 0);
                        default: return 0;
                      }
                    }
                  }
                  // Fallback: if no quotation details but has assignments, assume 1
                  return dayAssignments[role] ? 1 : 0;
                };

                return (
                  <div key={day} className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <h4 className="text-sm sm:text-base font-semibold text-foreground">
                        Day {String(day).padStart(2, '0')}
                      </h4>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      {/* Photographers */}
                      {(dayAssignments['Photographer'] || (hasQuotation && getRequiredCount('Photographer') > 0)) && (
                        <div className="flex items-center justify-between py-1 gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`${getRequiredCount('Photographer') > 0 ? (getAssignedCount('Photographer') < getRequiredCount('Photographer') ? 'text-red-600' : 'text-green-600') : 'text-muted-foreground'}`}>Photographer:</span>
                            {getRequiredCount('Photographer') > 0 && (
                              <span className={`text-xs font-medium ${getAssignedCount('Photographer') < getRequiredCount('Photographer') ? 'text-red-600' : 'text-green-600'}`}>
                                ({getAssignedCount('Photographer')}/{getRequiredCount('Photographer')})
                              </span>
                            )}
                          </div>
                          <span className={`font-medium flex-shrink-0 ${getRequiredCount('Photographer') > 0 ? (getAssignedCount('Photographer') < getRequiredCount('Photographer') ? 'text-red-600' : 'text-green-600') : 'text-foreground'}`}>
                            {dayAssignments['Photographer']?.map(a => a.profiles.full_name).join(', ') || 
                             <span className="text-red-600 font-medium">Not assigned</span>}
                          </span>
                        </div>
                      )}
                      
                      {/* Cinematographers */}
                      {(dayAssignments['Cinematographer'] || (hasQuotation && getRequiredCount('Cinematographer') > 0)) && (
                        <div className="flex items-center justify-between py-1 gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`${getRequiredCount('Cinematographer') > 0 ? (getAssignedCount('Cinematographer') < getRequiredCount('Cinematographer') ? 'text-red-600' : 'text-green-600') : 'text-muted-foreground'}`}>Cinematographer:</span>
                            {getRequiredCount('Cinematographer') > 0 && (
                              <span className={`text-xs font-medium ${getAssignedCount('Cinematographer') < getRequiredCount('Cinematographer') ? 'text-red-600' : 'text-green-600'}`}>
                                ({getAssignedCount('Cinematographer')}/{getRequiredCount('Cinematographer')})
                              </span>
                            )}
                          </div>
                          <span className={`font-medium flex-shrink-0 ${getRequiredCount('Cinematographer') > 0 ? (getAssignedCount('Cinematographer') < getRequiredCount('Cinematographer') ? 'text-red-600' : 'text-green-600') : 'text-foreground'}`}>
                            {dayAssignments['Cinematographer']?.map(a => a.profiles.full_name).join(', ') || 
                             <span className="text-red-600 font-medium">Not assigned</span>}
                          </span>
                        </div>
                      )}
                      
                      {/* Drone Pilots */}
                      {(dayAssignments['Drone Pilot'] || (hasQuotation && getRequiredCount('Drone Pilot') > 0)) && (
                        <div className="flex items-center justify-between py-1 gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`${getRequiredCount('Drone Pilot') > 0 ? (getAssignedCount('Drone Pilot') < getRequiredCount('Drone Pilot') ? 'text-red-600' : 'text-green-600') : 'text-muted-foreground'}`}>Drone Pilot:</span>
                            {getRequiredCount('Drone Pilot') > 0 && (
                              <span className={`text-xs font-medium ${getAssignedCount('Drone Pilot') < getRequiredCount('Drone Pilot') ? 'text-red-600' : 'text-green-600'}`}>
                                ({getAssignedCount('Drone Pilot')}/{getRequiredCount('Drone Pilot')})
                              </span>
                            )}
                          </div>
                          <span className={`font-medium flex-shrink-0 ${getRequiredCount('Drone Pilot') > 0 ? (getAssignedCount('Drone Pilot') < getRequiredCount('Drone Pilot') ? 'text-red-600' : 'text-green-600') : 'text-foreground'}`}>
                            {dayAssignments['Drone Pilot']?.map(a => a.profiles.full_name).join(', ') || 
                             <span className="text-red-600 font-medium">Not assigned</span>}
                          </span>
                        </div>
                      )}
                      
                      {/* Same Day Editors */}
                      {(dayAssignments['Same Day Editor'] || (hasQuotation && getRequiredCount('Same Day Editor') > 0)) && (
                        <div className="flex items-center justify-between py-1 gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`${getRequiredCount('Same Day Editor') > 0 ? (getAssignedCount('Same Day Editor') < getRequiredCount('Same Day Editor') ? 'text-red-600' : 'text-green-600') : 'text-muted-foreground'}`}>Same Day Editor:</span>
                            {getRequiredCount('Same Day Editor') > 0 && (
                              <span className={`text-xs font-medium ${getAssignedCount('Same Day Editor') < getRequiredCount('Same Day Editor') ? 'text-red-600' : 'text-green-600'}`}>
                                ({getAssignedCount('Same Day Editor')}/{getRequiredCount('Same Day Editor')})
                              </span>
                            )}
                          </div>
                          <span className={`font-medium flex-shrink-0 ${getRequiredCount('Same Day Editor') > 0 ? (getAssignedCount('Same Day Editor') < getRequiredCount('Same Day Editor') ? 'text-red-600' : 'text-green-600') : 'text-foreground'}`}>
                            {dayAssignments['Same Day Editor']?.map(a => a.profiles.full_name).join(', ') || 
                             <span className="text-red-600 font-medium">Not assigned</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State for Crew */}
          {!event.photographer && !event.cinematographer && !event.editor && !event.drone_pilot && staffAssignments.length === 0 && !hasQuotation && (
            <div className="text-center py-8">
              <UserIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <h3 className="text-sm font-semibold text-foreground mb-1">No Crew Requirements</h3>
              <p className="text-xs text-muted-foreground">
                This event doesn't have any crew requirements defined.
              </p>
            </div>
          )}

          {/* Event Tasks Section */}
          {eventTasks.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckmarkCircle02Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Event Tasks ({eventTasks.length})
              </h3>
              
              {eventTasks.map((task) => (
                <div key={task.id} className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h5 className="text-sm sm:text-base font-semibold text-foreground truncate">{task.title}</h5>
                    <div className="flex gap-1 flex-shrink-0">
                      <StatusBadge status={task.status} />
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex items-center justify-between py-1 gap-2">
                      <span className="text-muted-foreground flex-1 min-w-0">Assigned to:</span>
                      <span className="font-medium flex-shrink-0">
                        {task.assigned_staff?.full_name || task.freelancer?.full_name || 'Unassigned'}
                      </span>
                    </div>
                    {task.due_date && (
                      <div className="flex items-center justify-between py-1 gap-2">
                        <span className="text-muted-foreground flex-1 min-w-0">Due Date:</span>
                        <span className="font-medium flex-shrink-0">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckmarkCircle02Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Event Tasks
              </h3>
              <div className="text-center py-8">
                <CheckmarkCircle02Icon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
                <h3 className="text-sm font-semibold text-foreground mb-1">No Tasks</h3>
                <p className="text-xs text-muted-foreground">No tasks assigned to this event yet.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventCrewDialog;
