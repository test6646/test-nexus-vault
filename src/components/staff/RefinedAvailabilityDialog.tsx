import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';
import { 
  Calendar01Icon,
  UserGroupIcon,
  Search01Icon,
  PlusSignIcon,
  Delete02Icon
} from 'hugeicons-react';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useStaffAvailabilityCheck } from './hooks/useStaffAvailabilityCheck';
import { VALID_ROLES } from '@/lib/role-utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Database } from '@/integrations/supabase/types';

type AvailabilityOption = 'staff_availability' | 'event_staff_check';
type EventType = Database['public']['Enums']['event_type'];

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'Ring-Ceremony', label: 'Ring-Ceremony' },
  { value: 'Pre-Wedding', label: 'Pre-Wedding' },
  { value: 'Wedding', label: 'Wedding' },
  { value: 'Maternity Photography', label: 'Maternity Photography' },
  { value: 'Others', label: 'Others' }
];

const availabilityFormSchema = z.object({
  role: z.string().min(1, 'Please select a role'),
  eventType: z.string().optional(),
  customMessage: z.string().optional(),
});

const eventNotificationFormSchema = z.object({
  eventId: z.string().min(1, 'Please select an event'),
  globalMessage: z.string().optional(),
});

interface Event {
  id: string;
  title: string;
  event_date: string;
  event_end_date?: string;
  venue?: string;
  client_name?: string;
}

interface StaffAssignment {
  id: string;
  role: string;
  staff_id?: string;
  freelancer_id?: string;
  staff_name?: string;
  freelancer_name?: string;
  phone?: string;
  day_number: number;
  day_date: string;
  individualMessage?: string;
}

interface RefinedAvailabilityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const RefinedAvailabilityDialog = ({ 
  isOpen, 
  onOpenChange
}: RefinedAvailabilityDialogProps) => {
  const { currentFirmId } = useAuth();
  const { toast } = useToast();
  const { sendAvailabilityCheck } = useStaffAvailabilityCheck();
  
  const [selectedOption, setSelectedOption] = useState<AvailabilityOption>('staff_availability');
  const [selectedDates, setSelectedDates] = useState<Date[]>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return [tomorrow];
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const availabilityForm = useForm<z.infer<typeof availabilityFormSchema>>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      role: '',
      eventType: '',
      customMessage: '',
    },
  });

  const eventForm = useForm<z.infer<typeof eventNotificationFormSchema>>({
    resolver: zodResolver(eventNotificationFormSchema),
    defaultValues: {
      eventId: '',
      globalMessage: '',
    },
  });

  // Load events when dialog opens and event staff option is selected
  useEffect(() => {
    if (isOpen && selectedOption === 'event_staff_check' && currentFirmId) {
      loadEvents();
    }
  }, [isOpen, selectedOption, currentFirmId]);

  // Load staff assignments when event is selected
  useEffect(() => {
    if (selectedEvent) {
      loadEventStaffAssignments();
    }
  }, [selectedEvent]);

  const loadEvents = async () => {
    if (!currentFirmId) return;
    
    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          event_date,
          event_end_date,
          venue,
          clients!inner(
            name
          )
        `)
        .eq('firm_id', currentFirmId)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true });

      if (error) throw error;

      const formattedEvents = eventsData?.map(event => ({
        id: event.id,
        title: event.title,
        event_date: event.event_date,
        event_end_date: event.event_end_date,
        venue: event.venue,
        client_name: (event.clients as any)?.name || 'Unknown Client'
      })) || [];

      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      toast({
        title: "Error",
        description: "Failed to load events.",
        variant: "destructive"
      });
    }
  };

  const loadEventStaffAssignments = async () => {
    if (!selectedEvent || !currentFirmId) return;
    
    try {
      const { data: assignmentsData, error } = await supabase
        .from('event_staff_assignments')
        .select(`
          id,
          role,
          staff_id,
          freelancer_id,
          day_number,
          day_date,
          profiles!left(full_name, mobile_number),
          freelancers!left(full_name, phone)
        `)
        .eq('event_id', selectedEvent.id)
        .eq('firm_id', currentFirmId)
        .order('day_number', { ascending: true });

      if (error) throw error;

      // Group by unique staff/freelancer to avoid duplicates
      const uniqueStaffMap = new Map<string, StaffAssignment>();
      
      assignmentsData?.forEach(assignment => {
        const personId = assignment.staff_id || assignment.freelancer_id;
        const personType = assignment.staff_id ? 'staff' : 'freelancer';
        const key = `${personType}-${personId}`;
        
        if (!uniqueStaffMap.has(key)) {
          uniqueStaffMap.set(key, {
            id: assignment.id,
            role: assignment.role,
            staff_id: assignment.staff_id,
            freelancer_id: assignment.freelancer_id,
            staff_name: (assignment.profiles as any)?.full_name || undefined,
            freelancer_name: (assignment.freelancers as any)?.full_name || undefined,
            phone: (assignment.profiles as any)?.mobile_number || (assignment.freelancers as any)?.phone || '',
            day_number: assignment.day_number,
            day_date: assignment.day_date,
            individualMessage: ''
          });
        }
      });

      const formattedAssignments = Array.from(uniqueStaffMap.values());
      setStaffAssignments(formattedAssignments);
      eventForm.setValue('eventId', selectedEvent.id);
    } catch (error) {
      console.error('Error loading staff assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load staff assignments.",
        variant: "destructive"
      });
    }
  };

  // Staff Availability handlers
  const addNewDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDates(prev => [...prev, tomorrow]);
  };

  const updateDate = (index: number, date: Date | undefined) => {
    if (date) {
      setSelectedDates(prev => prev.map((d, i) => i === index ? date : d));
    }
  };

  const removeDate = (index: number) => {
    setSelectedDates(prev => prev.filter((_, i) => i !== index));
  };

  const onAvailabilitySubmit = async (values: z.infer<typeof availabilityFormSchema>) => {
    if (selectedDates.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please select at least one date.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendAvailabilityCheck({
        dates: selectedDates,
        role: values.role,
        eventType: values.eventType || undefined,
        customMessage: values.customMessage?.trim()
      });
      
      const dateText = selectedDates.length === 1 
        ? selectedDates[0].toLocaleDateString()
        : `${selectedDates.length} dates`;
      
      toast({
        title: "Availability Check Sent",
        description: `Availability request sent to all ${values.role} staff and freelancers for ${dateText}.`,
      });
      
      resetForm();
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to send availability check. Please try again.';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Event Staff handlers - no filtering applied
  const filteredEvents = events;

  const toggleStaffSelection = (assignmentId: string) => {
    setSelectedStaff(prev => 
      prev.includes(assignmentId) 
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const handleSendToAllToggle = (checked: boolean) => {
    setSendToAll(checked);
    if (checked) {
      setSelectedStaff(staffAssignments.map(assignment => assignment.id));
    } else {
      setSelectedStaff([]);
    }
  };

  const updateIndividualMessage = (assignmentId: string, message: string) => {
    setStaffAssignments(prev => 
      prev.map(assignment => 
        assignment.id === assignmentId 
          ? { ...assignment, individualMessage: message }
          : assignment
      )
    );
  };

  const onEventNotificationSubmit = async (values: z.infer<typeof eventNotificationFormSchema>) => {
    if (!sendToAll && selectedStaff.length === 0) {
      toast({
        title: "No Staff Selected",
        description: "Please select staff members or choose 'Send to All'.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const assignmentsToNotify = sendToAll 
        ? staffAssignments 
        : staffAssignments.filter(assignment => selectedStaff.includes(assignment.id));

      // Validate that at least one assignment has a message
      const validAssignments = assignmentsToNotify.filter(assignment => {
        const hasIndividualMessage = assignment.individualMessage?.trim();
        const hasGlobalMessage = values.globalMessage?.trim();
        return assignment.phone && (hasIndividualMessage || hasGlobalMessage);
      });

      if (validAssignments.length === 0) {
        toast({
          title: "No Message Provided",
          description: "Please provide either a global message or individual messages for selected staff.",
          variant: "destructive"
        });
        return;
      }

      for (const assignment of validAssignments) {
        const staffName = assignment.staff_name || assignment.freelancer_name || 'Staff Member';
        const messageToSend = assignment.individualMessage?.trim() || values.globalMessage?.trim() || '';
        
        // Fire and forget notification
        supabase.functions.invoke('send-staff-notification', {
          body: {
            staffName,
            staffPhone: assignment.phone,
            eventName: selectedEvent?.title,
            eventDate: selectedEvent?.event_date,
            venue: selectedEvent?.venue,
            role: assignment.role,
            customMessage: messageToSend,
            firmId: currentFirmId,
            notificationType: 'event_staff_notification'
          }
        }).then(() => {
          console.log(`Notification sent to ${staffName}`);
        }).catch(error => {
          console.warn(`Failed to send notification to ${staffName}:`, error);
        });
      }

      toast({
        title: "Notifications Sent",
        description: `Successfully sent notifications to ${validAssignments.length} staff members.`,
      });
      
      resetForm();
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notifications.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    // Don't reset selectedDates to maintain tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDates([tomorrow]);
    
    availabilityForm.reset();
    eventForm.reset();
    setSelectedEvent(null);
    setStaffAssignments([]);
    setSelectedStaff([]);
    setSendToAll(false);
    
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] md:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Staff Notifications</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Option Selection */}
          <div className="space-y-2">
            <Label>Notification Type</Label>
            <Select value={selectedOption} onValueChange={(value) => setSelectedOption(value as AvailabilityOption)}>
              <SelectTrigger>
                <SelectValue placeholder="Select notification type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff_availability">Staff Availability</SelectItem>
                <SelectItem value="event_staff_check">Event Staff Work Assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Staff Availability Check UI */}
          {selectedOption === 'staff_availability' && (
            <Form {...availabilityForm}>
              <form onSubmit={availabilityForm.handleSubmit(onAvailabilitySubmit)} className="space-y-6">
                {/* Date Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Select Dates <Badge variant="secondary">{selectedDates.length}</Badge></Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNewDate}
                    >
                      <PlusSignIcon className="h-4 w-4 mr-1" />
                      Add Date
                    </Button>
                  </div>
                  
                   <div className="space-y-2">
                     {selectedDates.map((date, index) => (
                       <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                         <div className="flex-1">
                           <InlineDatePicker
                             value={date}
                             onSelect={(newDate) => updateDate(index, newDate)}
                             placeholder="Select date"
                           />
                         </div>
                         <Button
                           type="button"
                           variant="ghost"
                           size="sm"
                           onClick={() => removeDate(index)}
                           className="text-destructive hover:text-destructive"
                         >
                           <Delete02Icon className="h-4 w-4" />
                         </Button>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Role and Event Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={availabilityForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VALID_ROLES.filter(role => role !== 'Admin').map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={availabilityForm.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {EVENT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={availabilityForm.control}
                  name="customMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Message</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Add any specific instructions..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || selectedDates.length === 0}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? "Sending..." : "Send Availability Check"}
                </Button>
              </form>
            </Form>
          )}

          {/* Event Staff Notifications UI */}
          {selectedOption === 'event_staff_check' && (
            <div className="space-y-6">
              {/* Event Selection Dropdown */}
              <div className="space-y-3">
                <Label>Select Event</Label>
                
                <Select 
                  value={selectedEvent?.id || ''} 
                  onValueChange={(value) => {
                    const event = events.find(e => e.id === value);
                    setSelectedEvent(event || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {filteredEvents.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No events found
                      </div>
                    ) : (
                      filteredEvents.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          <div className="flex flex-col text-left w-full">
                            <span className="font-medium">{event.title}</span>
                            <span className="text-xs text-muted-foreground">
                              {event.client_name} • {new Date(event.event_date).toLocaleDateString()}
                              {event.venue && ` • ${event.venue}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Staff Assignment Form */}
              {selectedEvent && staffAssignments.length > 0 && (
                <Form {...eventForm}>
                  <form onSubmit={eventForm.handleSubmit(onEventNotificationSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Staff Assignments <Badge variant="secondary">{staffAssignments.length}</Badge></Label>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="send-to-all"
                            checked={sendToAll}
                            onCheckedChange={handleSendToAllToggle}
                          />
                          <Label htmlFor="send-to-all">Send to All</Label>
                        </div>
                      </div>

                       <div className="space-y-2">
                         {staffAssignments.map((assignment) => (
                           <div key={assignment.id} className="p-2 border rounded">
                             <div className="flex items-start gap-2">
                               <Checkbox
                                 checked={selectedStaff.includes(assignment.id)}
                                 onCheckedChange={() => toggleStaffSelection(assignment.id)}
                                 className="mt-1"
                               />
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                   <span className="font-medium text-sm">
                                     {assignment.staff_name || assignment.freelancer_name}
                                   </span>
                                   <Badge variant="outline" className="text-xs">{assignment.role}</Badge>
                                 </div>
                                 <div className="text-xs text-muted-foreground mb-2">
                                   Phone: {assignment.phone || 'N/A'}
                                 </div>
                                 <Textarea
                                   placeholder="Individual message"
                                   value={assignment.individualMessage || ''}
                                   onChange={(e) => updateIndividualMessage(assignment.id, e.target.value)}
                                   rows={2}
                                   className="w-full text-sm"
                                 />
                               </div>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>

                    <FormField
                      control={eventForm.control}
                      name="globalMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Global Message (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Enter the message to send to selected staff..."
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || (!sendToAll && selectedStaff.length === 0)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isLoading ? "Sending..." : `Send to ${sendToAll ? staffAssignments.length : selectedStaff.length} Staff`}
                    </Button>
                  </form>
                </Form>
              )}

              {selectedEvent && staffAssignments.length === 0 && (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  <UserGroupIcon className="h-8 w-8 mx-auto mb-2" />
                  <p>No staff assigned to this event.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RefinedAvailabilityDialog;