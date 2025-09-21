import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Event, EventFormData } from '@/types/studio';
import { useStaffAvailability } from '@/hooks/useStaffAvailability';

interface Staff {
  id: string;
  full_name: string;
  role: string;
  mobile_number: string;
}

interface MultiDayAssignment {
  day: number;
  photographer_ids: string[];
  cinematographer_ids: string[];
  drone_pilot_id: string;
  same_day_editor_ids: string[];
}

export const useStaffAssignments = (
  currentEvent: Event | null,
  allStaff: Staff[],
  freelancers: any[],
  allCombinedPeople: any[],
  profile: any,
  eventDate?: string,
  totalDays?: number
) => {
  const { toast } = useToast();
  const { getAvailableStaffForRole } = useStaffAvailability({
    eventDate,
    totalDays,
    excludeEventId: currentEvent?.id
  });
  
  const [multiDayAssignments, setMultiDayAssignments] = useState<MultiDayAssignment[]>([
    { day: 1, photographer_ids: [''], cinematographer_ids: [''], drone_pilot_id: '', same_day_editor_ids: [] }
  ]);

  // Helper function to get required crew count from quotation
  const getRequiredCrewCount = (role: string, day: number = 1, quotationDetails?: any) => {
    if (!quotationDetails?.days) return 0;
    
    const dayConfig = quotationDetails.days[day - 1];
    if (!dayConfig) return 0;
    
    switch (role) {
      case 'Photographer':
        return dayConfig.photographers || 0;
      case 'Cinematographer':
        return dayConfig.cinematographers || 0;
      case 'Drone Pilot':
        return dayConfig.drone || 0;
      case 'Same Day Editor':
        // Check for sameDayEditors field in dayConfig, fallback to sameDayEditing flag
        return dayConfig.sameDayEditors || (quotationDetails?.sameDayEditing ? 1 : 0);
      default:
        return 0;
    }
  };

  const processExistingStaffAssignments = async (assignments: any[], eventData?: any) => {
    // Get quotation details
    let quotationDetails = null;
    const eventWithQuotation = eventData || currentEvent;
    
    if (eventWithQuotation?.quotation_details) {
      quotationDetails = eventWithQuotation.quotation_details;
    } else if (eventWithQuotation?.quotation_source_id) {
      try {
        const { data: quotationData, error } = await supabase
          .from('quotations')
          .select('quotation_details')
          .eq('id', eventWithQuotation.quotation_source_id)
          .single();
          
        if (!error && quotationData?.quotation_details) {
          quotationDetails = quotationData.quotation_details;
        }
      } catch (error) {
        // Error handling
      }
    }
    
    // Group existing assignments by day and role (excluding Editor role as it's handled separately)
    const groupedByDay = new Map();
    
    assignments.forEach(assignment => {
      // Skip Editor role assignments as they are handled by same_day_editor
      if (assignment.role === 'Editor') return;
      
      const dayKey = assignment.day_number;
      if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, {
          day: dayKey,
          photographer_ids: [],
          cinematographer_ids: [],
          drone_pilot_id: ''
        });
      }
      
      const dayData = groupedByDay.get(dayKey);
      const assigneeId = assignment.staff_id || assignment.freelancer_id;
      
      if (assigneeId) {
        if (assignment.role === 'Photographer') {
          dayData.photographer_ids.push(assigneeId);
        } else if (assignment.role === 'Cinematographer') {
          dayData.cinematographer_ids.push(assigneeId);
        } else if (assignment.role === 'Drone Pilot') {
          dayData.drone_pilot_id = assigneeId;
        } else if (assignment.role === 'Same Day Editor') {
          dayData.same_day_editor_ids.push(assigneeId);
        }
      }
    });
    
    // Generate correct slots using quotation logic
    const totalDays = eventData?.total_days || (currentEvent as any)?.total_days || 1;
    const processedAssignments = [];
    
    for (let day = 1; day <= totalDays; day++) {
      const existingDayData = groupedByDay.get(day) || {
        day,
        photographer_ids: [],
        cinematographer_ids: [],
        drone_pilot_id: '',
        same_day_editor_ids: []
      };
      
      const requiredPhotographers = getRequiredCrewCount('Photographer', day, quotationDetails);
      const requiredCinematographers = getRequiredCrewCount('Cinematographer', day, quotationDetails);
      const requiredDrone = getRequiredCrewCount('Drone Pilot', day, quotationDetails);
      const requiredSameDayEditors = getRequiredCrewCount('Same Day Editor', day, quotationDetails);
      
      const finalDayData = {
        day,
        photographer_ids: [],
        cinematographer_ids: [],
        drone_pilot_id: existingDayData.drone_pilot_id || '',
        same_day_editor_ids: []
      };
      
      // Photographers: Always create required slots from quotation first
      if (requiredPhotographers > 0) {
        for (let i = 0; i < requiredPhotographers; i++) {
          finalDayData.photographer_ids.push(existingDayData.photographer_ids[i] || '');
        }
      } else if (existingDayData.photographer_ids.length > 0) {
        finalDayData.photographer_ids = existingDayData.photographer_ids;
      } else {
        finalDayData.photographer_ids = ['', '', '', '']; // 4 photographer slots for manual events
      }
      
      // Cinematographers: Always create required slots from quotation first
      if (requiredCinematographers > 0) {
        for (let i = 0; i < requiredCinematographers; i++) {
          finalDayData.cinematographer_ids.push(existingDayData.cinematographer_ids[i] || '');
        }
      } else if (existingDayData.cinematographer_ids.length > 0) {
        finalDayData.cinematographer_ids = existingDayData.cinematographer_ids;
      } else {
        finalDayData.cinematographer_ids = ['', '', '']; // 3 cinematographer slots for manual events
      }
      
      // Drone Pilot: Respect quotation requirements or keep existing
      if (requiredDrone > 0) {
        finalDayData.drone_pilot_id = existingDayData.drone_pilot_id || '';
      } else if (existingDayData.drone_pilot_id) {
        finalDayData.drone_pilot_id = existingDayData.drone_pilot_id;
      }

      // Same Day Editors: Handle based on quotation requirements
      if (requiredSameDayEditors > 0) {
        for (let i = 0; i < requiredSameDayEditors; i++) {
          finalDayData.same_day_editor_ids.push(existingDayData.same_day_editor_ids[i] || '');
        }
      } else if (existingDayData.same_day_editor_ids.length > 0) {
        finalDayData.same_day_editor_ids = existingDayData.same_day_editor_ids;
      }
      
      processedAssignments.push(finalDayData);
    }
    
    setMultiDayAssignments(processedAssignments);
  };

  const generateMultiDayAssignments = (totalDays: number, quotationDetails?: any) => {
    const assignments = [];
    for (let day = 1; day <= totalDays; day++) {
      const dayData: MultiDayAssignment = {
        day,
        photographer_ids: [''],
        cinematographer_ids: [''],
        drone_pilot_id: '',
        same_day_editor_ids: [],
      };

      // Apply quotation requirements if available
      if (quotationDetails?.days?.[day - 1]) {
        const dayConfig = quotationDetails.days[day - 1];
        const photographerCount = dayConfig.photographers || 0;
        const cinematographerCount = dayConfig.cinematographers || 0;
        const droneRequired = dayConfig.drone || 0;
        const sameDayEditorsRequired = dayConfig.sameDayEditors || (quotationDetails?.sameDayEditing ? 1 : 0);

        if (photographerCount > 0) {
          dayData.photographer_ids = Array(photographerCount).fill('');
        } else {
          dayData.photographer_ids = [''];
        }
        
        if (cinematographerCount > 0) {
          dayData.cinematographer_ids = Array(cinematographerCount).fill('');
        } else {
          dayData.cinematographer_ids = [''];
        }
        
        if (droneRequired > 0) {
          dayData.drone_pilot_id = '';
        }

        if (sameDayEditorsRequired > 0) {
          dayData.same_day_editor_ids = Array(sameDayEditorsRequired).fill('');
        }
      } else {
        // For manual events without quotation, provide multiple slots
        dayData.photographer_ids = ['', '', '', ''];
        dayData.cinematographer_ids = ['', '', ''];
        dayData.drone_pilot_id = '';
        dayData.same_day_editor_ids = [];
      }

      assignments.push(dayData);
    }
    return assignments;
  };

  const updateStaffAssignment = (dayIndex: number, field: string, slotIndex: number | null, value: string) => {
    setMultiDayAssignments(prev => {
      const updated = [...prev];
      const dayData = { ...updated[dayIndex] };
      
      if (field === 'photographer_ids' || field === 'cinematographer_ids' || field === 'same_day_editor_ids') {
        const currentArray = [...(dayData[field as keyof MultiDayAssignment] as string[])];
        if (slotIndex !== null) {
          currentArray[slotIndex] = value;
        }
        (dayData as any)[field] = currentArray;
      } else {
        (dayData as any)[field] = value;
      }
      
      updated[dayIndex] = dayData;
      return updated;
    });
  };

  const addStaffSlot = (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids' | 'same_day_editor_ids') => {
    setMultiDayAssignments(prev => {
      const updated = [...prev];
      const dayData = { ...updated[dayIndex] };
      const currentArray = [...(dayData[field] as string[])];
      currentArray.push('');
      (dayData as any)[field] = currentArray;
      updated[dayIndex] = dayData;
      return updated;
    });
  };

  const removeStaffSlot = (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids' | 'same_day_editor_ids', slotIndex: number) => {
    setMultiDayAssignments(prev => {
      const updated = [...prev];
      const dayData = { ...updated[dayIndex] };
      const currentArray = [...(dayData[field] as string[])];
      currentArray.splice(slotIndex, 1);
      (dayData as any)[field] = currentArray;
      updated[dayIndex] = dayData;
      return updated;
    });
  };

  const saveStaffAssignments = async (eventId: string, formData: EventFormData) => {
    try {
      // Get existing assignments to track new ones for notifications
      const { data: existingAssignments, error: existingError } = await supabase
        .from('event_staff_assignments')
        .select('staff_id, freelancer_id, role, day_number')
        .eq('event_id', eventId);
      
      if (existingError) {
        // Error handling for existing assignments
      }
      
      // Create a set of existing assignment keys for comparison
      const existingAssignmentKeys = new Set(
        (existingAssignments || []).map(a => 
          `${a.staff_id || a.freelancer_id}-${a.role}-${a.day_number}`
        )
      );
      
      // Delete existing assignments first for clean slate
      const { error: deleteError } = await supabase
        .from('event_staff_assignments')
        .delete()
        .eq('event_id', eventId);
        
      if (deleteError) {
        throw deleteError;
      }

      // Create lookup maps for staff and freelancers
      const staffMap = new Map(allStaff.map(s => [s.id, s]));
      const freelancerMap = new Map(freelancers.map(f => [f.id, f]));
      const allStaffIds = new Set([...staffMap.keys(), ...freelancerMap.keys()]);

      // Insert new assignments
      const assignments = [];
      
      for (const dayAssignment of multiDayAssignments) {
        const eventDate = new Date(formData.event_date);
        const dayDate = new Date(eventDate);
        dayDate.setDate(eventDate.getDate() + (dayAssignment.day - 1));

        // Add photographers
        const validPhotographerIds = dayAssignment.photographer_ids.filter(id => id && id.trim() !== '');
        validPhotographerIds.forEach(photographerId => {
          if (allStaffIds.has(photographerId)) {
            const isFreelancer = freelancerMap.has(photographerId);
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : photographerId,
              freelancer_id: isFreelancer ? photographerId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Photographer',
              day_number: dayAssignment.day,
              day_date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
              firm_id: localStorage.getItem('selectedFirmId'),
            });
          }
        });

        // Add cinematographers
        const validCinematographerIds = dayAssignment.cinematographer_ids.filter(id => id && id.trim() !== '');
        validCinematographerIds.forEach(cinematographerId => {
          if (allStaffIds.has(cinematographerId)) {
            const isFreelancer = freelancerMap.has(cinematographerId);
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : cinematographerId,
              freelancer_id: isFreelancer ? cinematographerId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Cinematographer',
              day_number: dayAssignment.day,
              day_date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
              firm_id: localStorage.getItem('selectedFirmId'),
            });
          }
        });

        // Add drone pilot
        if (dayAssignment.drone_pilot_id && dayAssignment.drone_pilot_id.trim() !== '') {
          if (allStaffIds.has(dayAssignment.drone_pilot_id)) {
            const isFreelancer = freelancerMap.has(dayAssignment.drone_pilot_id);
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : dayAssignment.drone_pilot_id,
              freelancer_id: isFreelancer ? dayAssignment.drone_pilot_id : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Drone Pilot',
              day_number: dayAssignment.day,
              day_date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
              firm_id: localStorage.getItem('selectedFirmId'),
            });
          }
        }

        // Add same day editors
        const validSameDayEditorIds = dayAssignment.same_day_editor_ids.filter(id => id && id.trim() !== '');
        validSameDayEditorIds.forEach(editorId => {
          if (allStaffIds.has(editorId)) {
            const isFreelancer = freelancerMap.has(editorId);
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : editorId,
              freelancer_id: isFreelancer ? editorId : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Same Day Editor',
              day_number: dayAssignment.day,
              day_date: `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`,
              firm_id: localStorage.getItem('selectedFirmId'),
            });
          }
        });
      }

      // Same day editors are now handled within daily assignments above

      // Store new assignments for notifications
      const newAssignments = assignments.filter(a => {
        const key = `${a.staff_id || a.freelancer_id}-${a.role}-${a.day_number}`;
        return !existingAssignmentKeys.has(key);
      });
      
      (window as any).newStaffAssignments = newAssignments;

      // Insert assignments if any exist
      if (assignments.length > 0) {
        const { error: insertError } = await supabase
          .from('event_staff_assignments')
          .insert(assignments);
          
        if (insertError) {
          throw insertError;
        }
      }
    } catch (error: any) {
      throw error;
    }
  };

  return {
    multiDayAssignments,
    setMultiDayAssignments,
    processExistingStaffAssignments,
    generateMultiDayAssignments,
    updateStaffAssignment,
    addStaffSlot,
    removeStaffSlot,
    saveStaffAssignments,
  };
};
