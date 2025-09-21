import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types/studio';

export const useGlobalEventStats = () => {
  const { currentFirmId } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentFirmId) {
      fetchGlobalEvents();

      // Set up real-time listeners for global stats
      const eventsChannel = supabase
        .channel('global-events-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalEvents();
        })
        .subscribe();

      const paymentsChannel = supabase
        .channel('global-payments-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'payments',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalEvents();
        })
        .subscribe();

      const closingBalancesChannel = supabase
        .channel('global-closing-balances-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'event_closing_balances',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalEvents();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(eventsChannel);
        supabase.removeChannel(paymentsChannel);
        supabase.removeChannel(closingBalancesChannel);
      };
    }
  }, [currentFirmId]);

  const fetchGlobalEvents = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);

      // Fetch ALL events for global stats (no filters)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching global event stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { events, loading };
};