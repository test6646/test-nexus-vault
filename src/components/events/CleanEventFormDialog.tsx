import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Users, Camera, Video, Edit, Plus, Minus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { InlineDatePicker } from '@/components/ui/inline-date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Event, Client, EventFormData, Quotation } from '@/types/studio';
import { sanitizeUuidFields } from '@/lib/uuid-utils';

import type { Database } from '@/integrations/supabase/types';
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync';
import SmartClientQuotationSelector from './SmartClientQuotationSelector';

type EventType = Database['public']['Enums']['event_type'];

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
}

interface CleanEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  editingEvent?: Event | null;
  onSuccess: () => void;
}

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'Ring-Ceremony', label: 'Ring Ceremony' },
  { value: 'Pre-Wedding', label: 'Pre-Wedding' },
  { value: 'Wedding', label: 'Wedding' },
  { value: 'Maternity Photography', label: 'Maternity Photography' },
  { value: 'Others', label: 'Others' }
];

const CleanEventFormDialog = ({ open, onOpenChange, event, editingEvent, onSuccess }: CleanEventFormDialogProps) => {
  const currentEvent = editingEvent || event;
  const { profile } = useAuth();
  const { toast } = useToast();
  const { syncItemToSheets } = useGoogleSheetsSync();
  
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  
  // Initialize form data with proper default values
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    client_id: '',
    event_type: 'Wedding',
    event_date: '',
    venue: '',
    description: '',
    total_amount: 0,
    photographer_id: '',
    videographer_id: '',
  });

  const [extendedData, setExtendedData] = useState({
    advance_amount: 0,
    editor_id: '',
    total_days: 1,
    same_day_editor: false,
    same_day_editor_id: '',
  });

  const [sameDayEditors, setSameDayEditors] = useState<string[]>(['']);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Check if quotation has same day editing enabled
  const quotationHasSameDayEditing = selectedQuotation?.quotation_details?.sameDayEditing === true;

  const [multiDayAssignments, setMultiDayAssignments] = useState<Array<{
    day: number;
    photographer_ids: string[];
    videographer_ids: string[];
    editor_id: string;
  }>>([{ day: 1, photographer_ids: [''], videographer_ids: [''], editor_id: '' }]);

  // Filter staff by role - more inclusive filtering
  const photographers = allStaff.filter(s => 
    s.role === 'Photographer' || s.role === 'Admin' || s.role?.toLowerCase().includes('photographer')
  );
  const videographers = allStaff.filter(s => 
    s.role === 'Videographer' || s.role === 'Admin' || s.role?.toLowerCase().includes('videographer')
  );
  const editors = allStaff.filter(s => 
    s.role === 'Editor' || s.role === 'Admin' || s.role?.toLowerCase().includes('editor')
  );
  
  // Load initial data when dialog opens, then populate form if editing
  useEffect(() => {
    if (open) {
      loadData().then(() => {
        // After data is loaded, populate form if editing
        if (currentEvent) {
          populateFormData();
        } else {
          resetForm();
        }
      });
    }
  }, [open, currentEvent?.id]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        resetForm();
        setSelectedQuotation(null);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const loadData = async () => {
    if (!profile?.current_firm_id) return;
    
    try {
      // Load clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', profile.current_firm_id)
        .order('name');

      if (clientsError) throw clientsError;

      // Load staff
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('id, full_name, role, mobile_number')
        .eq('firm_id', profile.current_firm_id)
        .order('full_name');

      if (staffError) throw staffError;

      setClients(clientsData || []);
      setAllStaff(staffData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadEventStaffAssignments = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_staff_assignments')
        .select('*')
        .eq('event_id', eventId)
        .order('day_number');

      if (error) throw error;

      if (data && data.length > 0) {
        // Group assignments by day and role
        const groupedAssignments = data.reduce((acc, assignment) => {
          const existing = acc.find(a => a.day === assignment.day_number);
          if (existing) {
            if (assignment.role === 'Photographer') {
              existing.photographer_ids.push(assignment.staff_id);
            } else if (assignment.role === 'Videographer') {
              existing.videographer_ids.push(assignment.staff_id);
            } else if (assignment.role === 'Editor') {
              existing.editor_id = assignment.staff_id;
            }
          } else {
            const newAssignment = {
              day: assignment.day_number,
              photographer_ids: assignment.role === 'Photographer' ? [assignment.staff_id] : [],
              videographer_ids: assignment.role === 'Videographer' ? [assignment.staff_id] : [],
              editor_id: assignment.role === 'Editor' ? assignment.staff_id : '',
            };
            acc.push(newAssignment);
          }
          return acc;
        }, [] as typeof multiDayAssignments);

        setMultiDayAssignments(groupedAssignments);
      }
    } catch (error: any) {
      console.error('Error loading staff assignments:', error);
    }
  };

  const populateFormData = async () => {
    if (!currentEvent) {
      return;
    }
    
    // Set all form data synchronously and immediately
    setFormData({
      title: currentEvent.title || '',
      client_id: currentEvent.client_id || '',
      event_type: currentEvent.event_type || 'Wedding',
      event_date: currentEvent.event_date || '',
      venue: currentEvent.venue || '',
      description: currentEvent.description || '',
      total_amount: currentEvent.total_amount || 0,
      photographer_id: currentEvent.photographer_id || '',
      videographer_id: currentEvent.videographer_id || '',
    });

    setExtendedData({
      advance_amount: currentEvent.advance_amount || 0,
      editor_id: currentEvent.editor_id || '',
      total_days: (currentEvent as any).total_days || 1,
      same_day_editor: (currentEvent as any).same_day_editor || false,
      same_day_editor_id: (currentEvent as any).same_day_editor_id || '',
    });
    
    // Initialize same day editors if editing
    if ((currentEvent as any).same_day_editor_id) {
      setSameDayEditors([(currentEvent as any).same_day_editor_id]);
    } else {
      setSameDayEditors(['']);
    }

    // Load existing staff assignments for editing
    if (currentEvent.id) {
      await loadEventStaffAssignments(currentEvent.id);
    }

    
  };

  const resetForm = () => {
    
    setFormData({
      title: '',
      client_id: '',
      event_type: 'Wedding',
      event_date: '',
      venue: '',
      description: '',
      total_amount: 0,
      photographer_id: '',
      videographer_id: '',
    });

    setExtendedData({
      advance_amount: 0,
      editor_id: '',
      total_days: 1,
      same_day_editor: false,
      same_day_editor_id: '',
    });
    
    setSameDayEditors(['']);
    setMultiDayAssignments([{ day: 1, photographer_ids: [''], videographer_ids: [''], editor_id: '' }]);
  };

  const handleQuotationSelect = (quotation: Quotation | null) => {
    setSelectedQuotation(quotation);
    
    if (quotation) {
      // Extract days from quotation details
      let totalDays = 1;
      
      if (quotation.quotation_details) {
        const details = quotation.quotation_details as any;
        
        // Check if days array exists and get its length
        if (details?.days && Array.isArray(details.days)) {
          totalDays = details.days.length;
        } else {
          // Fallback to other possible keys
          totalDays = details?.total_days || 
                     details?.duration_days ||
                     details?.event_days ||
                     (details?.duration ? parseInt(details.duration) : 1) ||
                     1;
        }

        // Check for same day editor in quotation details
        if (details?.sameDayEditorEnabled) {
          setExtendedData(prev => ({
            ...prev,
            same_day_editor: details.sameDayEditorEnabled,
          }));
        }
      }
      
      // Ensure totalDays is a valid number and within reasonable bounds
      if (isNaN(totalDays) || totalDays < 1) {
        totalDays = 1;
      }
      if (totalDays > 10) {
        totalDays = 10; // Cap at 10 days max
      }
      
      setFormData(prev => ({
        ...prev,
        title: quotation.title,
        event_type: quotation.event_type,
        event_date: quotation.event_date,
        venue: quotation.venue || '',
        description: quotation.description || '',
        total_amount: quotation.amount,
      }));

      setExtendedData(prev => ({
        ...prev,
        total_days: totalDays,
      }));

      // Initialize multi-day staff assignments based on extracted days and quotation crew config
      const dayAssignments = [];
      const quotationDetails = quotation.quotation_details as any;
      
      for (let i = 1; i <= totalDays; i++) {
        // Get quotation crew configuration for this day
        const dayConfig = quotationDetails?.days?.[i - 1];
        
        // Create exact number of dropdowns based on quotation counts
        const photographerCount = dayConfig?.photographers || 0;
        const videographerCount = dayConfig?.cinematographers || 0;
        
        dayAssignments.push({
          day: i,
          photographer_ids: Array(photographerCount).fill(''),
          videographer_ids: Array(videographerCount).fill(''),
          editor_id: '',
        });
      }
      setMultiDayAssignments(dayAssignments);
    }
  };

  const calculateBalance = () => {
    return formData.total_amount - extendedData.advance_amount;
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Event title is required",
        variant: "destructive",
      });
      return false;
    }

    if (!formData.event_date) {
      toast({
        title: "Validation Error",
        description: "Event date is required",
        variant: "destructive",
      });
      return false;
    }

    // Validate crew member assignments based on quotation requirements
    if (selectedQuotation?.quotation_details) {
      const quotationDetails = selectedQuotation.quotation_details as any;
      
      for (const dayAssignment of multiDayAssignments) {
        const dayConfig = quotationDetails.days?.[dayAssignment.day - 1];
        
        if (dayConfig) {
          // Check photographer requirements
          const requiredPhotographers = dayConfig.photographers || 0;
          const assignedPhotographers = dayAssignment.photographer_ids.filter(id => id && id.trim() !== '').length;
          
          if (requiredPhotographers > 0 && assignedPhotographers < requiredPhotographers) {
            toast({
              title: "Validation Error",
              description: `Day ${dayAssignment.day} requires ${requiredPhotographers} photographer(s), but only ${assignedPhotographers} assigned`,
              variant: "destructive",
            });
            return false;
          }
          
          // Check videographer requirements
          const requiredVideographers = dayConfig.cinematographers || 0;
          const assignedVideographers = dayAssignment.videographer_ids.filter(id => id && id.trim() !== '').length;
          
          if (requiredVideographers > 0 && assignedVideographers < requiredVideographers) {
            toast({
              title: "Validation Error",
              description: `Day ${dayAssignment.day} requires ${requiredVideographers} videographer(s), but only ${assignedVideographers} assigned`,
              variant: "destructive",
            });
            return false;
          }
        }
      }
    }

    // Validate same day editor assignments
    if (quotationHasSameDayEditing) {
      const assignedEditors = sameDayEditors.filter(id => id && id.trim() !== '').length;
      if (assignedEditors === 0) {
        toast({
          title: "Validation Error",
          description: "At least one same day editor must be assigned",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.current_firm_id || !validateForm()) return;

    setLoading(true);
    
    // IMMEDIATE UI RESPONSE - Show optimistic loading state
    toast({
      title: "Saving...",
      description: "Creating your event...",
    });

    try {
      const sanitizedFormData = sanitizeUuidFields(formData, [
        'client_id', 
        'photographer_id', 
        'videographer_id'
      ]);
      
      const sanitizedExtendedData = sanitizeUuidFields(extendedData, [
        'editor_id'
      ]);

      const eventData = {
        ...sanitizedFormData,
        ...sanitizedExtendedData,
        firm_id: profile.current_firm_id,
        created_by: profile.id,
        balance_amount: calculateBalance(),
        quotation_source_id: selectedQuotation?.id || null,
        total_days: extendedData.total_days,
        same_day_editor: extendedData.same_day_editor,
        same_day_editor_id: extendedData.same_day_editor && sameDayEditors.length > 0 ? sameDayEditors[0] : null,
      };

      let result;
      if (currentEvent) {
        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', currentEvent.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        
        // Critical operations only - staff assignments
        await saveStaffAssignments(result.id);
        
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;

        // Critical operations only - staff assignments and quotation conversion
        await Promise.all([
          saveStaffAssignments(result.id),
          selectedQuotation ? supabase
            .from('quotations')
            .update({ converted_to_event: result.id })
            .eq('id', selectedQuotation.id) : Promise.resolve()
        ]);
      }

      // INSTANT SUCCESS RESPONSE
      const hasStaffAssigned = multiDayAssignments.some(day => 
        day.photographer_ids.some(id => id && id.trim() !== '') || 
        day.videographer_ids.some(id => id && id.trim() !== '') || 
        (day.editor_id && day.editor_id.trim() !== '')
      );
      
      toast({
        title: currentEvent ? "✅ Event Updated!" : "✅ Event Created!",
        description: currentEvent 
          ? "Event updated successfully" 
          : hasStaffAssigned 
            ? "Event created! Notifications being sent..."
            : "Event created successfully",
      });

      // IMMEDIATELY close dialog and refresh
      onSuccess();
      onOpenChange(false);
      
      // ALL BACKGROUND OPERATIONS - Run after UI updates
      setTimeout(() => {
        const runBackgroundTasks = async () => {
          try {
            const hasAssignedStaff = multiDayAssignments.some(day => 
              day.photographer_ids.some(id => id && id.trim() !== '') || 
              day.videographer_ids.some(id => id && id.trim() !== '') || 
              (day.editor_id && day.editor_id.trim() !== '')
            );

            // Background sync operations
            await Promise.allSettled([
              supabase.functions.invoke('sync-event-to-calendar', {
                body: { eventId: result.id }
              }),
              supabase.functions.invoke('sync-event-to-google', {
                body: { eventId: result.id }
              }),
              sendEventNotifications(result.id, formData.title)
            ]);
            
            // Background operations completed
          } catch (error) {
            // Background operations completed with some errors (non-critical)
          }
        };
        
        runBackgroundTasks();
      }, 100);

    } catch (error: any) {
      console.error('Error saving event:', error);
      toast({
        title: currentEvent ? "❌ Update Failed" : "❌ Creation Failed",
        description: error.message || "Please check all fields and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendEventNotifications = async (eventId: string, eventTitle: string) => {
    // No notifications for crew members - NO TASKS CREATED
    
    // No task creation for event crew members
    // Tasks should only be created manually for:
    // - Photo Editing
    // - Video Editing  
    // - Other administrative tasks
  };

  const saveStaffAssignments = async (eventId: string) => {
    try {
      // Delete existing assignments
      await supabase
        .from('event_staff_assignments')
        .delete()
        .eq('event_id', eventId);

      // Insert new assignments
      const assignments = [];
      
      for (const dayAssignment of multiDayAssignments) {
        const eventDate = new Date(formData.event_date);
        const dayDate = new Date(eventDate);
        dayDate.setDate(eventDate.getDate() + (dayAssignment.day - 1));

        // Add all photographers for this day
        dayAssignment.photographer_ids.forEach(photographerId => {
          if (photographerId) {
            assignments.push({
              event_id: eventId,
              staff_id: photographerId,
              role: 'Photographer',
              day_number: dayAssignment.day,
              day_date: dayDate.toISOString().split('T')[0],
              firm_id: profile?.current_firm_id,
            });
          }
        });

        // Add all videographers for this day
        dayAssignment.videographer_ids.forEach(videographerId => {
          if (videographerId) {
            assignments.push({
              event_id: eventId,
              staff_id: videographerId,
              role: 'Videographer',
              day_number: dayAssignment.day,
              day_date: dayDate.toISOString().split('T')[0],
              firm_id: profile?.current_firm_id,
            });
          }
        });

        if (dayAssignment.editor_id) {
          assignments.push({
            event_id: eventId,
            staff_id: dayAssignment.editor_id,
            role: 'Editor',
            day_number: dayAssignment.day,
            day_date: dayDate.toISOString().split('T')[0],
            firm_id: profile?.current_firm_id,
          });
        }
      }

      if (assignments.length > 0) {
        const { error } = await supabase
          .from('event_staff_assignments')
          .insert(assignments);

        if (error) throw error;
      }

      // Update main event table with primary photographer and videographer
      await updateMainEventStaffFields(eventId);
      
      // Create staff assignments for same day editors if assigned
      if (quotationHasSameDayEditing && sameDayEditors.some(id => id && id.trim() !== '')) {
        await createSameDayEditorAssignments(eventId);
      }
    } catch (error: any) {
      console.error('Error saving staff assignments:', error);
      // Don't throw error as event creation was successful
    }
  };

  const createSameDayEditorAssignments = async (eventId: string) => {
    try {
      const assignments = [];
      
      for (const editorId of sameDayEditors.filter(id => id && id.trim() !== '')) {
        const editorStaff = allStaff.find(s => s.id === editorId);
        if (editorStaff) {
          assignments.push({
            event_id: eventId,
            staff_id: editorId,
            role: 'Same Day Editor',
            day_number: 1,
            day_date: formData.event_date,
            firm_id: profile?.current_firm_id,
          });
        }
      }
      
      if (assignments.length > 0) {
        const { error } = await supabase
          .from('event_staff_assignments')
          .insert(assignments);
          
        if (error) throw error;
        
        
        toast({
          title: "Same Day Editors Assigned",
          description: `${assignments.length} same-day editor(s) assigned for the event`,
        });
      }
    } catch (error: any) {
      console.error('Error creating same day editor assignments:', error);
    }
  };

  const updateMainEventStaffFields = async (eventId: string) => {
    try {
      // Get the first day's primary photographer and videographer
      const firstDayAssignment = multiDayAssignments.find(day => day.day === 1);
      
      const updates: any = {};
      
      if (firstDayAssignment?.photographer_ids?.length > 0 && firstDayAssignment.photographer_ids[0]) {
        updates.photographer_id = firstDayAssignment.photographer_ids[0];
      }
      
      if (firstDayAssignment?.videographer_ids?.length > 0 && firstDayAssignment.videographer_ids[0]) {
        updates.videographer_id = firstDayAssignment.videographer_ids[0];
      }
      
      if (firstDayAssignment?.editor_id) {
        updates.editor_id = firstDayAssignment.editor_id;
      }

      // Only update if we have updates to make
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', eventId);

        if (error) throw error;
        // Updated main event staff fields
      }
    } catch (error: any) {
      console.error('Error updating main event staff fields:', error);
    }
  };

  const updateMultiDayAssignment = (day: number, role: 'photographer_ids' | 'videographer_ids' | 'editor_id', staffId: string | string[]) => {
    setMultiDayAssignments(prev => 
      prev.map(assignment => 
        assignment.day === day 
          ? { ...assignment, [role]: staffId }
          : assignment
      )
    );
  };

  const addStaffToDay = (day: number, role: 'photographer_ids' | 'videographer_ids', staffId: string) => {
    // Check if staff member is already assigned on this day
    const currentDayAssignment = multiDayAssignments.find(a => a.day === day);
    if (currentDayAssignment) {
      const isAlreadyAssigned = currentDayAssignment.photographer_ids.includes(staffId) ||
                               currentDayAssignment.videographer_ids.includes(staffId) ||
                               currentDayAssignment.editor_id === staffId;
      
      if (isAlreadyAssigned) {
        const staffName = [...photographers, ...videographers].find(s => s.id === staffId)?.full_name || 'Unknown';
        alert(`${staffName} is already assigned on Day ${day}. The same crew member cannot be assigned to multiple roles on the same day.`);
        return;
      }
    }
    
    setMultiDayAssignments(prev => 
      prev.map(assignment => 
        assignment.day === day 
          ? { 
              ...assignment, 
              [role]: [...(assignment[role] as string[]), staffId]
            }
          : assignment
      )
    );
  };

  const removeStaffFromDay = (day: number, role: 'photographer_ids' | 'videographer_ids', staffId: string) => {
    setMultiDayAssignments(prev => 
      prev.map(assignment => 
        assignment.day === day 
          ? { 
              ...assignment, 
              [role]: (assignment[role] as string[]).filter(id => id !== staffId)
            }
          : assignment
      )
    );
  };

  const handleTotalDaysChange = (days: number) => {
    setExtendedData(prev => ({ ...prev, total_days: days }));
    
    // Adjust multi-day assignments
    const newAssignments = [];
    for (let i = 1; i <= days; i++) {
      const existing = multiDayAssignments.find(a => a.day === i);
        newAssignments.push(existing || {
          day: i,
          photographer_ids: [''],
          videographer_ids: [''],
          editor_id: '',
        });
    }
    setMultiDayAssignments(newAssignments);
  };

  // Same day editor functions
  const addSameDayEditor = () => {
    setSameDayEditors([...sameDayEditors, '']);
  };

  const removeSameDayEditor = (index: number) => {
    if (sameDayEditors.length > 1) {
      setSameDayEditors(sameDayEditors.filter((_, i) => i !== index));
    }
  };

  const updateSameDayEditor = (index: number, editorId: string) => {
    // Check if this staff member is already assigned on any day
    const isAlreadyAssigned = multiDayAssignments.some(assignment => 
      assignment.photographer_ids.includes(editorId) ||
      assignment.videographer_ids.includes(editorId) ||
      assignment.editor_id === editorId
    ) || sameDayEditors.some((existingId, existingIndex) => 
      existingIndex !== index && existingId === editorId
    );
    
    if (isAlreadyAssigned) {
      const staffName = editors.find(s => s.id === editorId)?.full_name || 'Unknown';
      alert(`${staffName} is already assigned to this event. The same crew member cannot be assigned to multiple roles.`);
      return;
    }
    
    const newEditors = [...sameDayEditors];
    newEditors[index] = editorId;
    setSameDayEditors(newEditors);
    
    // Update the first editor as primary
    if (index === 0) {
      setExtendedData(prev => ({ ...prev, same_day_editor_id: editorId }));
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {currentEvent ? 'Edit Event' : 'Create New Event'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
             
             {/* First Row: Event Title and Client */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="title" className="text-sm font-medium">Event Title *</Label>
                 <Input
                   id="title"
                   value={formData.title}
                   onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                   placeholder="Enter event title"
                    className="rounded-full"
                   required
                 />
               </div>

               <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Client *
                  </Label>
                 <Select 
                   value={formData.client_id || ''} 
                   onValueChange={(value) => {
                     setFormData({ ...formData, client_id: value });
                     setSelectedQuotation(null); // Reset quotation when client changes
                   }}
                 >
                    <SelectTrigger className="rounded-full">
                     <SelectValue placeholder="Select client" />
                   </SelectTrigger>
                   <SelectContent>
                     {clients.map((client) => (
                       <SelectItem key={client.id} value={client.id}>
                         {client.name} - {client.phone}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>

              {/* Second Row: Active Quotation and Event Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  {formData.client_id ? (
                    <SmartClientQuotationSelector
                      selectedClientId={formData.client_id}
                      onQuotationSelect={(quotation) => {
                        setSelectedQuotation(quotation);
                        handleQuotationSelect(quotation);
                      }}
                      selectedQuotationId={selectedQuotation?.id}
                    />
                  ) : (
                    <div>
                      <Label className="text-sm font-medium">Active Quotation</Label>
                      <div className="h-10 bg-muted/30 rounded-full flex items-center justify-center text-sm text-muted-foreground">
                        Select client first
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Event Type *</Label>
                  <Select 
                    value={formData.event_type} 
                    onValueChange={(value) => setFormData({ ...formData, event_type: value as EventType })}
                  >
                    <SelectTrigger className="rounded-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Third Row: Event Date and Venue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

               <div className="space-y-2">
                 <Label className="text-sm font-medium">Event Date *</Label>
                 <InlineDatePicker
                   onSelect={(date) => setFormData({ ...formData, event_date: date ? date.toISOString().split('T')[0] : '' })}
                   value={formData.event_date ? new Date(formData.event_date) : undefined}
                   placeholder="Select event date"
                 />
               </div>

               <div className="space-y-2">
                 <Label className="text-sm font-medium">Venue</Label>
                 <Input
                   value={formData.venue}
                   onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                   placeholder="Event venue"
                    className="rounded-full"
                 />
               </div>
             </div>
          </div>

          {/* Financial Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Financial Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total Bill Amount</Label>
                <Input
                  type="number"
                  value={formData.total_amount.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setFormData({ ...formData, total_amount: value === '' ? 0 : parseFloat(value) || 0 });
                    }
                  }}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="rounded-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Credit/Advance Amount</Label>
                <Input
                  type="number"
                  value={extendedData.advance_amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setExtendedData({ ...extendedData, advance_amount: value === '' ? 0 : parseFloat(value) || 0 });
                    }
                  }}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="rounded-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Still Amount</Label>
                <div className="p-3 bg-muted/50 border rounded-full h-10 flex items-center">
                  <span className="text-sm font-semibold">₹{calculateBalance().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Day Staff Assignment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Staff Assignment by Day ({extendedData.total_days} {extendedData.total_days === 1 ? 'Day' : 'Days'})
            </h3>
            
            <div className="space-y-4">
              {multiDayAssignments.map((dayAssignment) => (
                <div key={dayAssignment.day} className="border rounded-xl p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 shadow-sm">
                  <h4 className="text-base font-semibold mb-3 text-primary flex items-center justify-between">
                    <span>Day {dayAssignment.day}</span>
                    {extendedData.total_days > 1 && (
                      <span className="text-xs text-muted-foreground font-normal bg-white/80 px-2 py-1 rounded-full">
                        {new Date(new Date(formData.event_date).getTime() + (dayAssignment.day - 1) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                     {/* Show photographer fields based on quotation requirements */}
                     {(!selectedQuotation || dayAssignment.photographer_ids.length > 0) && (
                       <div className="space-y-3">
                         <Label className="text-sm font-semibold flex items-center gap-2">
                           <Camera className="h-4 w-4" />
                           Photographers {selectedQuotation && (
                             <span className="text-xs text-muted-foreground bg-white/80 px-2 py-1 rounded-full">
                               ({dayAssignment.photographer_ids.length} required)
                             </span>
                           )}
                         </Label>
                         
                         {/* Selected photographers - exact count based on quotation */}
                         {dayAssignment.photographer_ids.map((photographerId, index) => (
                           <div key={index} className="flex gap-2">
                               <Select 
                                 value={photographerId} 
                                 onValueChange={(value) => {
                                   // Check if this staff member is already assigned on this day
                                   const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                   const isAlreadyAssigned = currentDayAssignment?.photographer_ids.includes(value) ||
                                                           currentDayAssignment?.videographer_ids.includes(value) ||
                                                           currentDayAssignment?.editor_id === value;
                                   
                                   if (isAlreadyAssigned && value !== photographerId) {
                                     const staffName = photographers.find(s => s.id === value)?.full_name || 
                                                     videographers.find(s => s.id === value)?.full_name ||
                                                     'Unknown';
                                     alert(`${staffName} is already assigned on Day ${dayAssignment.day}. The same crew member cannot be assigned to multiple roles on the same day.`);
                                     return;
                                   }
                                   
                                   const newIds = [...dayAssignment.photographer_ids];
                                   newIds[index] = value;
                                   updateMultiDayAssignment(dayAssignment.day, 'photographer_ids', newIds);
                                 }}
                                 required={selectedQuotation !== null}
                               >
                                 <SelectTrigger className="rounded-full flex-1">
                                  <SelectValue placeholder={`Select photographer ${index + 1}${selectedQuotation ? ' *' : ''}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {photographers
                                    .filter(staff => {
                                      const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                      if (!currentDayAssignment) return true;
                                      // Allow current selection or staff not assigned to any role on this day
                                      return staff.id === photographerId ||
                                             (!currentDayAssignment.photographer_ids.includes(staff.id) &&
                                              !currentDayAssignment.videographer_ids.includes(staff.id) &&
                                              currentDayAssignment.editor_id !== staff.id);
                                    })
                                    .map((staff) => (
                                      <SelectItem key={staff.id} value={staff.id}>
                                        {staff.full_name} ({staff.role})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                           </div>
                         ))}
                         
                         {/* Only show Add button if not using quotation or if manual mode */}
                         {!selectedQuotation && (
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => addStaffToDay(dayAssignment.day, 'photographer_ids', '')}
                             className="rounded-full w-full"
                           >
                             <Plus className="h-4 w-4 mr-1" />
                             Add Photographer
                           </Button>
                         )}
                       </div>
                     )}

                     {/* Show videographer fields based on quotation requirements */}
                     {(!selectedQuotation || dayAssignment.videographer_ids.length > 0) && (
                       <div className="space-y-3">
                         <Label className="text-sm font-semibold flex items-center gap-2">
                           <Video className="h-4 w-4" />
                           Videographers {selectedQuotation && (
                             <span className="text-xs text-muted-foreground bg-white/80 px-2 py-1 rounded-full">
                               ({dayAssignment.videographer_ids.length} required)
                             </span>
                           )}
                         </Label>
                         
                         {/* Selected videographers - exact count based on quotation */}
                         {dayAssignment.videographer_ids.map((videographerId, index) => (
                           <div key={index} className="flex gap-2">
                              <Select 
                                value={videographerId} 
                                onValueChange={(value) => {
                                  // Check if this staff member is already assigned on this day
                                  const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                  const isAlreadyAssigned = currentDayAssignment?.photographer_ids.includes(value) ||
                                                          currentDayAssignment?.videographer_ids.includes(value) ||
                                                          currentDayAssignment?.editor_id === value;
                                  
                                  if (isAlreadyAssigned && value !== videographerId) {
                                    const staffName = photographers.find(s => s.id === value)?.full_name || 
                                                    videographers.find(s => s.id === value)?.full_name ||
                                                    'Unknown';
                                    alert(`${staffName} is already assigned on Day ${dayAssignment.day}. The same crew member cannot be assigned to multiple roles on the same day.`);
                                    return;
                                  }
                                  
                                  const newIds = [...dayAssignment.videographer_ids];
                                  newIds[index] = value;
                                  updateMultiDayAssignment(dayAssignment.day, 'videographer_ids', newIds);
                                }}
                                required={selectedQuotation !== null}
                              >
                                 <SelectTrigger className="rounded-full flex-1">
                                   <SelectValue placeholder={`Select videographer ${index + 1}${selectedQuotation ? ' *' : ''}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {videographers
                                    .filter(staff => {
                                      const currentDayAssignment = multiDayAssignments.find(a => a.day === dayAssignment.day);
                                      if (!currentDayAssignment) return true;
                                      // Allow current selection or staff not assigned to any role on this day
                                      return staff.id === videographerId ||
                                             (!currentDayAssignment.photographer_ids.includes(staff.id) &&
                                              !currentDayAssignment.videographer_ids.includes(staff.id) &&
                                              currentDayAssignment.editor_id !== staff.id);
                                    })
                                    .map((staff) => (
                                      <SelectItem key={staff.id} value={staff.id}>
                                        {staff.full_name} ({staff.role})
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                           </div>
                         ))}
                         
                         {/* Only show Add button if not using quotation or if manual mode */}
                         {!selectedQuotation && (
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={() => addStaffToDay(dayAssignment.day, 'videographer_ids', '')}
                             className="rounded-full w-full"
                           >
                             <Plus className="h-4 w-4 mr-1" />
                             Add Videographer
                           </Button>
                         )}
                       </div>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>


          {/* Same Day Editor Section - Show only when quotation has same day editing enabled */}
          {quotationHasSameDayEditing && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Post-Production</h3>
              <div className="border rounded-xl p-4 bg-gradient-to-r from-purple-50/50 to-pink-50/50 shadow-sm">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Same Day Editor {quotationHasSameDayEditing && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {sameDayEditors.map((editorId, index) => (
                    <div key={index} className="flex gap-2">
                       <Select 
                         value={editorId} 
                         onValueChange={(value) => updateSameDayEditor(index, value)}
                         required={quotationHasSameDayEditing}
                       >
                          <SelectTrigger className="rounded-full flex-1">
                            <SelectValue placeholder={`Select same day editor${quotationHasSameDayEditing ? ' *' : ''}`} />
                         </SelectTrigger>
                        <SelectContent>
                          {editors
                            .filter(staff => {
                              // Allow current selection or staff not assigned to any role on any day
                              const isCurrentSelection = staff.id === editorId;
                              const isAssignedElsewhere = multiDayAssignments.some(assignment => 
                                assignment.photographer_ids.includes(staff.id) ||
                                assignment.videographer_ids.includes(staff.id) ||
                                assignment.editor_id === staff.id
                              ) || sameDayEditors.some((existingId, existingIndex) => 
                                existingIndex !== index && existingId === staff.id
                              );
                              return isCurrentSelection || !isAssignedElsewhere;
                            })
                            .map((staff) => (
                              <SelectItem key={staff.id} value={staff.id}>
                                {staff.full_name} ({staff.role})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {sameDayEditors.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeSameDayEditor(index)}
                          className="p-2 h-9 w-9 rounded-full"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSameDayEditor}
                    className="rounded-full w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Same Day Editor
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Details</h3>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Event description and additional notes"
                  rows={3}
                  className="resize-none h-20"
                />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="rounded-full">
              {loading ? 'Saving...' : currentEvent ? 'Update Event' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
      
    </Dialog>
  );
};

export default CleanEventFormDialog;
