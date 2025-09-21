import { supabase } from '@/integrations/supabase/client';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface StaffAssignment {
  staff_id?: string;
  freelancer_id?: string;
  role: string;
  day_number: number;
  day_date: string;
  event_id: string;
}

export interface EventDateInfo {
  event_date: string;
  event_end_date?: string;
  total_days: number;
}

/**
 * Check if two date ranges overlap
 * @param range1 First date range
 * @param range2 Second date range
 * @returns true if the ranges overlap
 */
export const datesOverlap = (range1: DateRange, range2: DateRange): boolean => {
  const start1 = new Date(range1.startDate);
  const end1 = new Date(range1.endDate);
  const start2 = new Date(range2.startDate);
  const end2 = new Date(range2.endDate);

  // Check for overlap: 
  // - New event start date is between existing event's start and end date, OR
  // - New event end date is between existing event's start and end date, OR  
  // - New event fully covers existing event's date range, OR
  // - Existing event fully covers new event's date range
  return (
    (start1 >= start2 && start1 <= end2) ||  // New start is within existing range
    (end1 >= start2 && end1 <= end2) ||      // New end is within existing range
    (start1 <= start2 && end1 >= end2) ||    // New event covers existing event
    (start2 <= start1 && end2 >= end1)       // Existing event covers new event
  );
};

/**
 * Calculate the date range for an event based on event_date, total_days, and optional event_end_date
 * @param eventInfo Event date information
 * @returns DateRange object
 */
export const calculateEventDateRange = (eventInfo: EventDateInfo): DateRange => {
  const startDate = new Date(eventInfo.event_date);
  let endDate: Date;

  if (eventInfo.event_end_date) {
    endDate = new Date(eventInfo.event_end_date);
  } else {
    // Calculate end date based on total_days
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (eventInfo.total_days - 1));
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

/**
 * Get all staff assignments for events that overlap with the given date range
 * @param dateRange The date range to check for conflicts
 * @param excludeEventId Optional event ID to exclude from the check (for editing existing events)
 * @param firmId The firm ID to filter assignments
 * @returns Array of conflicting assignments
 */
export const getConflictingAssignments = async (
  dateRange: DateRange,
  excludeEventId?: string,
  firmId?: string
): Promise<StaffAssignment[]> => {
  try {
    let query = supabase
      .from('event_staff_assignments')
      .select(`
        staff_id,
        freelancer_id,
        role,
        day_number,
        day_date,
        event_id,
        events!inner(
          event_date,
          event_end_date,
          total_days,
          firm_id
        )
      `);

    // Filter by firm if provided
    if (firmId) {
      query = query.eq('events.firm_id', firmId);
    }

    // Exclude current event if editing
    if (excludeEventId) {
      query = query.neq('event_id', excludeEventId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Error fetching conflicting assignments:', error);
      return [];
    }

    if (!assignments) return [];

    // Filter assignments by date overlap
    const conflictingAssignments = assignments.filter(assignment => {
      const event = (assignment as any).events;
      const eventDateRange = calculateEventDateRange({
        event_date: event.event_date,
        event_end_date: event.event_end_date,
        total_days: event.total_days || 1
      });

      return datesOverlap(dateRange, eventDateRange);
    });

    return conflictingAssignments.map(assignment => ({
      staff_id: assignment.staff_id,
      freelancer_id: assignment.freelancer_id,
      role: assignment.role,
      day_number: assignment.day_number,
      day_date: assignment.day_date,
      event_id: assignment.event_id
    }));
  } catch (error) {
    console.error('Error in getConflictingAssignments:', error);
    return [];
  }
};

/**
 * Check if a specific staff member or freelancer is available for the given date range
 * @param personId Staff or freelancer ID
 * @param dateRange Date range to check
 * @param excludeEventId Optional event ID to exclude (for editing)
 * @param firmId Firm ID to filter assignments
 * @returns Promise<boolean> - true if available, false if conflicts exist
 */
export const isPersonAvailable = async (
  personId: string,
  dateRange: DateRange,
  excludeEventId?: string,
  firmId?: string
): Promise<boolean> => {
  if (!personId) return true;

  const conflictingAssignments = await getConflictingAssignments(dateRange, excludeEventId, firmId);
  
  // Check if this person is assigned to any conflicting events
  return !conflictingAssignments.some(assignment => 
    assignment.staff_id === personId || assignment.freelancer_id === personId
  );
};

/**
 * Filter available staff/freelancers for a given date range
 * @param people Array of staff/freelancers to filter
 * @param dateRange Date range to check availability for
 * @param excludeEventId Optional event ID to exclude (for editing)
 * @param firmId Firm ID to filter assignments
 * @returns Promise<Array> - filtered list of available people
 */
export const filterAvailablePeople = async <T extends { id: string }>(
  people: T[],
  dateRange: DateRange,
  excludeEventId?: string,
  firmId?: string
): Promise<T[]> => {
  if (!people.length) return [];

  const conflictingAssignments = await getConflictingAssignments(dateRange, excludeEventId, firmId);
  
  // Create set of unavailable person IDs
  const unavailableIds = new Set(
    conflictingAssignments.map(assignment => 
      assignment.staff_id || assignment.freelancer_id
    ).filter(Boolean)
  );

  // Return only people who are not in the unavailable set
  return people.filter(person => !unavailableIds.has(person.id));
};

/**
 * Get detailed conflict information for a person
 * @param personId Staff or freelancer ID
 * @param dateRange Date range to check
 * @param excludeEventId Optional event ID to exclude
 * @param firmId Firm ID to filter assignments
 * @returns Promise with conflict details
 */
export const getPersonConflictDetails = async (
  personId: string,
  dateRange: DateRange,
  excludeEventId?: string,
  firmId?: string
): Promise<{
  hasConflict: boolean;
  conflictingEvents: Array<{
    eventId: string;
    eventTitle?: string;
    role: string;
    dateRange: DateRange;
  }>;
}> => {
  if (!personId) {
    return { hasConflict: false, conflictingEvents: [] };
  }

  try {
    let query = supabase
      .from('event_staff_assignments')
      .select(`
        staff_id,
        freelancer_id,
        role,
        event_id,
        events!inner(
          id,
          title,
          event_date,
          event_end_date,
          total_days,
          firm_id
        )
      `)
      .or(`staff_id.eq.${personId},freelancer_id.eq.${personId}`);

    if (firmId) {
      query = query.eq('events.firm_id', firmId);
    }

    if (excludeEventId) {
      query = query.neq('event_id', excludeEventId);
    }

    const { data: assignments, error } = await query;

    if (error) {
      console.error('Error fetching person conflicts:', error);
      return { hasConflict: false, conflictingEvents: [] };
    }

    if (!assignments) {
      return { hasConflict: false, conflictingEvents: [] };
    }

    const conflictingEvents = assignments
      .map(assignment => {
        const event = (assignment as any).events;
        const eventDateRange = calculateEventDateRange({
          event_date: event.event_date,
          event_end_date: event.event_end_date,
          total_days: event.total_days || 1
        });

        return {
          assignment,
          event,
          eventDateRange,
          hasOverlap: datesOverlap(dateRange, eventDateRange)
        };
      })
      .filter(item => item.hasOverlap)
      .map(item => ({
        eventId: item.event.id,
        eventTitle: item.event.title,
        role: item.assignment.role,
        dateRange: item.eventDateRange
      }));

    return {
      hasConflict: conflictingEvents.length > 0,
      conflictingEvents
    };
  } catch (error) {
    console.error('Error in getPersonConflictDetails:', error);
    return { hasConflict: false, conflictingEvents: [] };
  }
};