import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Freelancer } from '@/types/freelancer';

export const useGlobalFreelancerStats = () => {
  const { currentFirmId } = useAuth();
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentFirmId) {
      fetchGlobalFreelancers();

      // Set up real-time listener for global freelancer stats
      const freelancersChannel = supabase
        .channel('global-freelancers-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'freelancers',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalFreelancers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(freelancersChannel);
      };
    }
  }, [currentFirmId]);

  const fetchGlobalFreelancers = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);

      // Fetch ALL freelancers for global stats (no filters)
      const { data, error } = await supabase
        .from('freelancers')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFreelancers(data as Freelancer[] || []);
    } catch (error) {
      console.error('Error fetching global freelancer stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { freelancers, loading };
};