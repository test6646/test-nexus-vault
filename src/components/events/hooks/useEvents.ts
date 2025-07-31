
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types/studio';

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  const currentFirmId = profile?.current_firm_id;

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
          photographer:profiles!events_photographer_id_fkey(
            id,
            full_name
          ),
          videographer:profiles!events_videographer_id_fkey(
            id,
            full_name
          ),
          editor:profiles!events_editor_id_fkey(
            id,
            full_name
          )
        `)
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      if (error) {
        console.error('Error loading events:', error);
        throw error;
      }
      
      
      setEvents(data || []);
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
