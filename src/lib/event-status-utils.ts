import { Event } from '@/types/studio';

export type EventStatus = 'PENDING' | 'UPCOMING' | 'IN PROGRESS' | 'COMPLETED';

export interface EventStatusResult {
  label: EventStatus;
  value: string;
  colorClass: string;
}

/**
 * Determines event status based on mutually exclusive, logically consistent rules
 * 
 * PENDING: Event is scheduled more than 7 days from today
 * UPCOMING: Event is scheduled within the next 7 days  
 * IN PROGRESS: Event is currently happening (today is between start date and end date)
 * COMPLETED: Event has already ended (today is after the last day)
 */
export const getEventStatus = (event: Event): EventStatusResult => {
  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const eventStartDate = new Date(event.event_date);
  const eventStartOnly = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
  
  // Handle end date - use event_end_date if available, otherwise use event_date
  const rawEndDate = (event as any).event_end_date;
  const eventEndDate = rawEndDate ? new Date(rawEndDate) : eventStartDate;
  const eventEndOnly = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate());
  
  // Calculate days difference (positive means future, negative means past)
  const daysDifference = Math.ceil((eventStartOnly.getTime() - todayOnly.getTime()) / (1000 * 60 * 60 * 24));
  
  // Apply mutually exclusive logic in order of priority
  
  // 1. COMPLETED: Event has already ended (today > event_end_date)
  if (todayOnly > eventEndOnly) {
    return {
      label: 'COMPLETED',
      value: 'COMPLETED',
      colorClass: 'text-status-completed'
    };
  }
  
  // 2. IN PROGRESS: Event is currently happening (event_start_date <= today <= event_end_date)
  if (eventStartOnly <= todayOnly && eventEndOnly >= todayOnly) {
    return {
      label: 'IN PROGRESS',
      value: 'IN PROGRESS',
      colorClass: 'text-status-in-progress'
    };
  }
  
  // 3. UPCOMING: Event is scheduled within the next 7 days (0 < days_until_event <= 7)
  if (daysDifference > 0 && daysDifference <= 7) {
    return {
      label: 'UPCOMING',
      value: 'UPCOMING', 
      colorClass: 'text-status-pending'
    };
  }
  
  // 4. PENDING: Event is scheduled more than 7 days from today (days_until_event > 7)
  return {
    label: 'PENDING',
    value: 'PENDING',
    colorClass: 'text-status-draft'
  };
};

/**
 * Legacy compatibility function - returns format expected by RefinedEventSheetTable
 */
export const getEventStatusColor = (event: Event) => {
  const status = getEventStatus(event);
  return {
    label: status.label,
    color: status.colorClass
  };
};