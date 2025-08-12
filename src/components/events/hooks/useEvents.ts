
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
          ),
          event_staff_assignments(
            *,
            staff:profiles(id, full_name, role),
            freelancer:freelancers(id, full_name, role, phone, email)
          )
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      if (error) {
        console.error('Error loading events:', error);
        throw error;
      }
      
      // Process events to include quotation details
      const processedEvents = (data || []).map(event => ({
        ...event,
        quotation_details: (event.quotation_source as any)?.[0]?.quotation_details || null
      }));
      
      setEvents(processedEvents);
    } catch (error: any) {
      console.error("Error loading events:", error);
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
