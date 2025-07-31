
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Quotation, Client, EventType } from '@/types/studio';

export const useQuotations = () => {
  const { profile } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadQuotations = async () => {
    if (!profile?.current_firm_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          client:clients(*),
          event:events(id, title)
        `)
        .eq('firm_id', profile.current_firm_id)
        .is('converted_to_event', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data as any || []);
    } catch (error: any) {
      toast({
        title: "Error loading quotations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    if (!profile?.current_firm_id) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', profile.current_firm_id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error loading clients:', error);
    }
  };

  useEffect(() => {
    if (profile?.current_firm_id) {
      loadQuotations();
      loadClients();
    } else {
      setLoading(false);
    }
  }, [profile?.current_firm_id]);

  return {
    quotations,
    clients,
    loading,
    loadQuotations,
    loadClients
  };
};
