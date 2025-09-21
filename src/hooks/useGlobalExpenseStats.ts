import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export const useGlobalExpenseStats = () => {
  const { currentFirmId } = useAuth();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentFirmId) {
      fetchGlobalExpenses();

      // Set up real-time listener for global expense stats
      const expensesChannel = supabase
        .channel('global-expenses-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalExpenses();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(expensesChannel);
      };
    }
  }, [currentFirmId]);

  const fetchGlobalExpenses = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);

      // Fetch ALL expenses for global stats (no filters)
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching global expense stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { expenses, loading };
};