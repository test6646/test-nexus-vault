import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Quotation } from '@/types/studio';

export const useGlobalQuotationStats = () => {
  const { currentFirmId } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentFirmId) {
      fetchGlobalQuotations();

      // Set up real-time listener for global quotation stats
      const quotationsChannel = supabase
        .channel('global-quotations-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'quotations',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalQuotations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(quotationsChannel);
      };
    }
  }, [currentFirmId]);

  const fetchGlobalQuotations = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);

      // Fetch ALL quotations for global stats (no filters)
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error) {
      console.error('Error fetching global quotation stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { quotations, loading };
};