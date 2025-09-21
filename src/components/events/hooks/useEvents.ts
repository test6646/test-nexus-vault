
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types/studio';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  const { currentFirmId } = useAuth();

  const loadEvents = async () => {
    if (!currentFirmId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(
            id,
            name,
            email,
            phone,
            address,
            firm_id,
            created_at,
            updated_at,
            notes
          ),
          quotation_source:quotations(
            id,
            quotation_details
          )
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      // Fetch staff assignments separately to avoid relationship conflicts
      let staffAssignmentsData = [];
      if (data) {
        const eventIds = data.map(event => event.id);
        const { data: assignmentsData } = await supabase
          .from('event_staff_assignments')
          .select(`
            *,
            staff:profiles(id, full_name, role),
            freelancer:freelancers!event_staff_assignments_freelancer_id_fkey(id, full_name, role, phone, email)
          `)
          .in('event_id', eventIds);
        
        staffAssignmentsData = assignmentsData || [];
      }

      if (error) {
        throw error;
      }
      
      // Process events to include quotation details and staff assignments
      const processedEvents = (data || []).map(event => {
        // Add staff assignments to each event
        const eventStaffAssignments = staffAssignmentsData.filter(
          assignment => assignment.event_id === event.id
        );
        
        return {
          ...event,
          quotation_details: (event.quotation_source as any)?.quotation_details || null,
          event_staff_assignments: eventStaffAssignments
        };
      });
      
      setEvents(processedEvents);
    } catch (error: any) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [currentFirmId]);

  return {
    events,
    loading,
    loadEvents
  };
};
