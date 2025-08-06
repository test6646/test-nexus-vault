
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Expense, Event } from '@/types/studio';

export const useExpenses = () => {
  const { profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadExpenses = async () => {
    if (!profile?.current_firm_id) {
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
        .eq('firm_id', profile.current_firm_id)
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
    if (!profile?.current_firm_id) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title')
        .eq('firm_id', profile.current_firm_id)
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data as any || []);
    } catch (error: any) {
      console.error('Error loading events:', error);
    }
  };

  useEffect(() => {
    if (profile?.current_firm_id) {
      loadExpenses();
      loadEvents();
    } else {
      setLoading(false);
    }
  }, [profile?.current_firm_id]);

  return {
    expenses,
    events,
    loading,
    loadExpenses
  };
};
