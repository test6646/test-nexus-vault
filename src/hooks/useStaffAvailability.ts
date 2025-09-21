import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  filterAvailablePeople, 
  calculateEventDateRange, 
  isPersonAvailable,
  getPersonConflictDetails 
} from '@/lib/staff-availability-utils';

interface Staff {
  id: string;
  full_name: string;
  role: string;
  [key: string]: any;
}

interface UseStaffAvailabilityProps {
  eventDate?: string;
  eventEndDate?: string;
  totalDays?: number;
  excludeEventId?: string;
}

export const useStaffAvailability = ({
  eventDate,
  eventEndDate,
  totalDays = 1,
  excludeEventId
}: UseStaffAvailabilityProps) => {
  const { currentFirmId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Filter available staff for a specific date range
   */
  const getAvailableStaff = useCallback(async <T extends Staff>(
    staff: T[]
  ): Promise<T[]> => {
    if (!eventDate || !currentFirmId || !staff.length) {
      return staff;
    }

    setIsLoading(true);
    try {
      const dateRange = calculateEventDateRange({
        event_date: eventDate,
        event_end_date: eventEndDate,
        total_days: totalDays
      });

      const availableStaff = await filterAvailablePeople(
        staff,
        dateRange,
        excludeEventId,
        currentFirmId
      );

      return availableStaff;
    } catch (error) {
      console.error('Error filtering available staff:', error);
      return staff; // Fallback to original list
    } finally {
      setIsLoading(false);
    }
  }, [eventDate, eventEndDate, totalDays, excludeEventId, currentFirmId]);

  /**
   * Get available staff for a specific role, including currently selected staff
   */
  const getAvailableStaffForRole = useCallback(async <T extends Staff>(
    staff: T[],
    currentSelection?: string
  ): Promise<T[]> => {
    const availableStaff = await getAvailableStaff(staff);

    // If there's a current selection, make sure it's included even if not available
    // This prevents breaking existing assignments during editing
    if (currentSelection) {
      const currentStaff = staff.find(s => s.id === currentSelection);
      const isAlreadyIncluded = availableStaff.some(s => s.id === currentSelection);
      
      if (currentStaff && !isAlreadyIncluded) {
        return [currentStaff, ...availableStaff];
      }
    }

    return availableStaff;
  }, [getAvailableStaff]);

  /**
   * Check if a specific person is available for the current event dates
   */
  const checkPersonAvailability = useCallback(async (personId: string): Promise<boolean> => {
    if (!eventDate || !currentFirmId || !personId) {
      return true;
    }

    try {
      const dateRange = calculateEventDateRange({
        event_date: eventDate,
        event_end_date: eventEndDate,
        total_days: totalDays
      });

      return await isPersonAvailable(personId, dateRange, excludeEventId, currentFirmId);
    } catch (error) {
      console.error('Error checking person availability:', error);
      return true; // Fallback to available
    }
  }, [eventDate, eventEndDate, totalDays, excludeEventId, currentFirmId]);

  /**
   * Get detailed conflict information for a person
   */
  const getConflictDetails = useCallback(async (personId: string) => {
    if (!eventDate || !currentFirmId || !personId) {
      return { hasConflict: false, conflictingEvents: [] };
    }

    try {
      const dateRange = calculateEventDateRange({
        event_date: eventDate,
        event_end_date: eventEndDate,
        total_days: totalDays
      });

      return await getPersonConflictDetails(personId, dateRange, excludeEventId, currentFirmId);
    } catch (error) {
      console.error('Error getting conflict details:', error);
      return { hasConflict: false, conflictingEvents: [] };
    }
  }, [eventDate, eventEndDate, totalDays, excludeEventId, currentFirmId]);

  /**
   * Filter staff list to show availability status
   */
  const enrichStaffWithAvailability = useCallback(async <T extends Staff>(
    staff: T[]
  ): Promise<Array<T & { isAvailable: boolean; conflicts?: any }>> => {
    if (!eventDate || !currentFirmId) {
      return staff.map(s => ({ ...s, isAvailable: true }));
    }

    const enrichedStaff = await Promise.all(
      staff.map(async (person) => {
        const isAvailable = await checkPersonAvailability(person.id);
        const conflicts = isAvailable ? undefined : await getConflictDetails(person.id);
        
        return {
          ...person,
          isAvailable,
          conflicts
        };
      })
    );

    return enrichedStaff;
  }, [eventDate, currentFirmId, checkPersonAvailability, getConflictDetails]);

  return {
    isLoading,
    getAvailableStaff,
    getAvailableStaffForRole,
    checkPersonAvailability,
    getConflictDetails,
    enrichStaffWithAvailability
  };
};