import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface ExportTotalCounts {
  tasks: number;
  events: number;
  clients: number;
  quotations: number;
  expenses: number;
  freelancers: number;
  loading: boolean;
}

export const useExportTotalCounts = () => {
  const { currentFirmId, profile } = useAuth();
  const [counts, setCounts] = useState<ExportTotalCounts>({
    tasks: 0,
    events: 0,
    clients: 0,
    quotations: 0,
    expenses: 0,
    freelancers: 0,
    loading: true
  });

  useEffect(() => {
    const fetchTotalCounts = async () => {
      if (!currentFirmId) {
        setCounts(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setCounts(prev => ({ ...prev, loading: true }));

        // Fetch all counts in parallel
        const [tasksResult, eventsResult, clientsResult, quotationsResult, expensesResult, freelancersResult] = await Promise.all([
          // Tasks - handle role-based filtering
          profile?.role === 'Admin' 
            ? supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('firm_id', currentFirmId)
            : supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', profile?.id),
          
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('firm_id', currentFirmId),
          supabase.from('clients').select('*', { count: 'exact', head: true }).eq('firm_id', currentFirmId),
          supabase.from('quotations').select('*', { count: 'exact', head: true }).eq('firm_id', currentFirmId),
          supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('firm_id', currentFirmId),
          supabase.from('freelancers').select('*', { count: 'exact', head: true }).eq('firm_id', currentFirmId)
        ]);

        setCounts({
          tasks: tasksResult.count || 0,
          events: eventsResult.count || 0,
          clients: clientsResult.count || 0,
          quotations: quotationsResult.count || 0,
          expenses: expensesResult.count || 0,
          freelancers: freelancersResult.count || 0,
          loading: false
        });

      } catch (error) {
        console.error('Error fetching export total counts:', error);
        setCounts(prev => ({ ...prev, loading: false }));
      }
    };

    fetchTotalCounts();
  }, [currentFirmId, profile?.role, profile?.id]);

  return counts;
};