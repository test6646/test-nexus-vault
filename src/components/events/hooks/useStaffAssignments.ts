import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Event, EventFormData } from '@/types/studio';

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
  editor_id: string;
  drone_pilot_id: string;
}

export const useStaffAssignments = (
  currentEvent: Event | null,
  allStaff: Staff[],
  freelancers: any[],
  allCombinedPeople: any[],
  profile: any
) => {
  const { toast } = useToast();
  
  const [multiDayAssignments, setMultiDayAssignments] = useState<MultiDayAssignment[]>([
    { day: 1, photographer_ids: [''], cinematographer_ids: [''], editor_id: '', drone_pilot_id: '' }
  ]);

  // Helper function to get required crew count from quotation (same as EventCrewDialog)
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
      default:
        return 0;
    }
  };

  const processExistingStaffAssignments = async (assignments: any[], eventData?: any) => {
    console.log('=== PROCESSING EXISTING STAFF ASSIGNMENTS ===');
    console.log('Raw assignments:', assignments);
    console.log('Event data:', eventData);
    console.log('Current event:', currentEvent);
    
    // STEP 1: Get quotation details using the EXACT same approach as EventCrewDialog
    let quotationDetails = null;
    const eventWithQuotation = eventData || currentEvent;
    
    console.log('=== QUOTATION DETAILS EXTRACTION (EventCrewDialog approach) ===');
    
    // Try to get quotation details from the event object
    if (eventWithQuotation?.quotation_details) {
      quotationDetails = eventWithQuotation.quotation_details;
      console.log('✅ Using quotation details from event:', quotationDetails);
    }
    // If no direct quotation_details, try fetching from quotation_source_id
    else if (eventWithQuotation?.quotation_source_id) {
      try {
        console.log('🔄 Fetching quotation details from source ID:', eventWithQuotation.quotation_source_id);
        
        const { data: quotationData, error } = await supabase
          .from('quotations')
          .select('quotation_details')
          .eq('id', eventWithQuotation.quotation_source_id)
          .single();
          
        if (!error && quotationData?.quotation_details) {
          quotationDetails = quotationData.quotation_details;
          console.log('✅ Fetched quotation details from database:', quotationDetails);
        } else {
          console.warn('❌ Failed to fetch quotation details:', error);
        }
      } catch (error) {
        console.error('❌ Error fetching quotation details:', error);
      }
    }
    
    console.log('Final quotation details being used:', quotationDetails);
    
    // STEP 2: Group existing assignments by day and role
    const groupedByDay = new Map();
    
    assignments.forEach(assignment => {
      const dayKey = assignment.day_number;
      if (!groupedByDay.has(dayKey)) {
        groupedByDay.set(dayKey, {
          day: dayKey,
          photographer_ids: [],
          cinematographer_ids: [],
          editor_id: '',
          drone_pilot_id: ''
        });
      }
      
      const dayData = groupedByDay.get(dayKey);
      const assigneeId = assignment.staff_id || assignment.freelancer_id;
      
      console.log(`Processing assignment: Role=${assignment.role}, Day=${assignment.day_number}, AssigneeId=${assigneeId}`);
      
      if (assigneeId) {
        if (assignment.role === 'Photographer') {
          dayData.photographer_ids.push(assigneeId);
        } else if (assignment.role === 'Cinematographer') {
          dayData.cinematographer_ids.push(assigneeId);
        } else if (assignment.role === 'Editor') {
          dayData.editor_id = assigneeId;
        } else if (assignment.role === 'Drone Pilot') {
          dayData.drone_pilot_id = assigneeId;
        }
      }
    });
    
    // STEP 3: Generate correct slots using EXACT same logic as EventCrewDialog
    const totalDays = eventData?.total_days || (currentEvent as any)?.total_days || 1;
    const processedAssignments = [];
    
    for (let day = 1; day <= totalDays; day++) {
      const existingDayData = groupedByDay.get(day) || {
        day,
        photographer_ids: [],
        cinematographer_ids: [],
        editor_id: '',
        drone_pilot_id: ''
      };
      
      // CRITICAL: Use the EXACT same slot generation logic as EventCrewDialog
      const requiredPhotographers = getRequiredCrewCount('Photographer', day, quotationDetails);
      const requiredCinematographers = getRequiredCrewCount('Cinematographer', day, quotationDetails);
      const requiredDrone = getRequiredCrewCount('Drone Pilot', day, quotationDetails);
      
      console.log(`Day ${day} requirements from quotation: P=${requiredPhotographers}, C=${requiredCinematographers}, D=${requiredDrone}`);
      
      // Generate the correct number of slots based on quotation requirements
      const finalDayData = {
        day,
        photographer_ids: [],
        cinematographer_ids: [],
        editor_id: existingDayData.editor_id || '',
        drone_pilot_id: existingDayData.drone_pilot_id || ''
      };
      
      // CRITICAL FIX: ALWAYS ensure ALL crew types have at least 1 slot for ALL events
      console.log(`Day ${day}: Ensuring ALL crew types have slots (quotation: ${!!quotationDetails?.days?.[day - 1]})`);
      
      // Get existing assignments
      const existingPhotographers = existingDayData.photographer_ids || [];
      const existingCinematographers = existingDayData.cinematographer_ids || [];
      
      // PHOTOGRAPHERS: ALWAYS ensure at least 1 slot for manual events, respect quotation for quotation events
      if (quotationDetails?.days?.[day - 1] && requiredPhotographers > 0) {
        // Quotation-based: Use quotation requirements but ensure minimum 1 slot
        const neededSlots = Math.max(1, requiredPhotographers);
        finalDayData.photographer_ids = Array(neededSlots).fill('').map((_, i) => 
          existingPhotographers[i] || ''
        );
      } else {
        // Manual event: ALWAYS show at least 1 photographer slot even if no existing assignments
        finalDayData.photographer_ids = existingPhotographers.length > 0 
          ? [...existingPhotographers] 
          : ['']; // ALWAYS force at least 1 slot for manual events
      }
      
      // CINEMATOGRAPHERS: ALWAYS ensure at least 1 slot for manual events, respect quotation for quotation events  
      if (quotationDetails?.days?.[day - 1] && requiredCinematographers > 0) {
        // Quotation-based: Use quotation requirements but ensure minimum 1 slot
        const neededSlots = Math.max(1, requiredCinematographers);
        finalDayData.cinematographer_ids = Array(neededSlots).fill('').map((_, i) => 
          existingCinematographers[i] || ''
        );
      } else {
        // Manual event: ALWAYS show at least 1 cinematographer slot even if no existing assignments
        finalDayData.cinematographer_ids = existingCinematographers.length > 0 
          ? [...existingCinematographers] 
          : ['']; // ALWAYS force at least 1 slot for manual events
      }
      
      // EDITOR: ALWAYS show for all events (manual and quotation)
      finalDayData.editor_id = existingDayData.editor_id || '';
      
      // DRONE PILOT: ALWAYS show for manual events, conditionally for quotation events
      if (quotationDetails?.days?.[day - 1]) {
        // Quotation-based: Show if required by quotation OR if manually assigned
        if (requiredDrone > 0 || existingDayData.drone_pilot_id) {
          finalDayData.drone_pilot_id = existingDayData.drone_pilot_id || '';
        }
      } else {
        // Manual event: ALWAYS show drone pilot slot
        finalDayData.drone_pilot_id = existingDayData.drone_pilot_id || '';
      }
      
      processedAssignments.push(finalDayData);
      console.log(`Day ${day} final assignment:`, finalDayData);
    }
    
    console.log('Final processed staff assignments by day (EventCrewDialog approach):', processedAssignments);
    setMultiDayAssignments(processedAssignments);
  };

  const generateMultiDayAssignments = (totalDays: number, quotationDetails?: any) => {
    const assignments = [];
    for (let day = 1; day <= totalDays; day++) {
      const dayData: MultiDayAssignment = {
        day,
        photographer_ids: [''],
        cinematographer_ids: [''],
        editor_id: '',
        drone_pilot_id: '',
      };

      // Apply quotation requirements if available
      if (quotationDetails?.days?.[day - 1]) {
        const dayConfig = quotationDetails.days[day - 1];
        const photographerCount = dayConfig.photographers || 0;
        const cinematographerCount = dayConfig.cinematographers || 0;
        const droneRequired = dayConfig.drone || 0;

        // FIXED: Create exact number of slots as required by quotation
        if (photographerCount > 0) {
          dayData.photographer_ids = Array(photographerCount).fill('');
        } else {
          dayData.photographer_ids = [''];  // Always at least one slot
        }
        
        if (cinematographerCount > 0) {
          dayData.cinematographer_ids = Array(cinematographerCount).fill('');
        } else {
          dayData.cinematographer_ids = [''];  // Always at least one slot
        }
        
        if (droneRequired > 0) {
          dayData.drone_pilot_id = '';
        }
      } else {
        // ✅ FIX: For manual events without quotation, provide multiple slots with adjustable controls
        dayData.photographer_ids = ['', '']; // Start with 2 photographer slots
        dayData.cinematographer_ids = ['', '']; // Start with 2 cinematographer slots
        dayData.editor_id = '';
        dayData.drone_pilot_id = '';
      }

      assignments.push(dayData);
    }
    return assignments;
  };

  const updateStaffAssignment = (dayIndex: number, field: string, slotIndex: number | null, value: string) => {
    setMultiDayAssignments(prev => {
      const updated = [...prev];
      const dayData = { ...updated[dayIndex] };
      
      if (field === 'photographer_ids' || field === 'cinematographer_ids') {
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

  const addStaffSlot = (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids') => {
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

  const removeStaffSlot = (dayIndex: number, field: 'photographer_ids' | 'cinematographer_ids', slotIndex: number) => {
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
      console.log('=== SAVING STAFF ASSIGNMENTS ===');
      
      // Get existing assignments to track new ones for notifications
      const { data: existingAssignments, error: existingError } = await supabase
        .from('event_staff_assignments')
        .select('staff_id, freelancer_id, role, day_number')
        .eq('event_id', eventId);
      
      if (existingError) {
        console.error('Error fetching existing assignments:', existingError);
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
        console.error('Error deleting existing assignments:', deleteError);
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
              day_date: dayDate.toISOString().split('T')[0],
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
              day_date: dayDate.toISOString().split('T')[0],
              firm_id: localStorage.getItem('selectedFirmId'),
            });
          }
        });

        // Add editor
        if (dayAssignment.editor_id && dayAssignment.editor_id.trim() !== '') {
          if (allStaffIds.has(dayAssignment.editor_id)) {
            const isFreelancer = freelancerMap.has(dayAssignment.editor_id);
            assignments.push({
              event_id: eventId,
              staff_id: isFreelancer ? null : dayAssignment.editor_id,
              freelancer_id: isFreelancer ? dayAssignment.editor_id : null,
              staff_type: isFreelancer ? 'freelancer' : 'staff',
              role: 'Editor',
              day_number: dayAssignment.day,
              day_date: dayDate.toISOString().split('T')[0],
              firm_id: localStorage.getItem('selectedFirmId'),
            });
          }
        }

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
              day_date: dayDate.toISOString().split('T')[0],
              firm_id: localStorage.getItem('selectedFirmId'),
            });
          }
        }
      }

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
          console.error('Error inserting assignments:', insertError);
          throw insertError;
        }
        
        console.log(`Successfully saved ${assignments.length} staff assignments`);
      }
    } catch (error: any) {
      console.error('Error saving staff assignments:', error);
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
