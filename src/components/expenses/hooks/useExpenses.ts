
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Expense, Event } from '@/types/studio';

export const useExpenses = () => {
  const { profile, currentFirmId } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadExpenses = async () => {
    if (!currentFirmId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          event:events(id, title)
        `)
        .eq('firm_id', currentFirmId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error loading expenses",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!currentFirmId) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('firm_id', currentFirmId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data as any || []);
    } catch (error: any) {
      // Error handling
    }
  };

  useEffect(() => {
    if (currentFirmId) {
      loadExpenses();
      loadEvents();
    } else {
      setLoading(false);
    }
  }, [currentFirmId]);

  return {
    expenses,
    events,
    loading,
    loadExpenses
  };
};
