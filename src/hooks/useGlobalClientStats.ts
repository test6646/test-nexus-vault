import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/types/studio';

export const useGlobalClientStats = () => {
  const { currentFirmId } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentFirmId) {
      fetchGlobalClients();

      // Set up real-time listener for global client stats
      const clientsChannel = supabase
        .channel('global-clients-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalClients();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(clientsChannel);
      };
    }
  }, [currentFirmId]);

  const fetchGlobalClients = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);

      // Fetch ALL clients for global stats (no filters)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching global client stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { clients, loading };
};