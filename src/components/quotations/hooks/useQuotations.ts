
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Quotation, Client, EventType } from '@/types/studio';


export const useQuotations = () => {
  const { profile, currentFirmId } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadQuotations = async () => {
    if (!currentFirmId) {
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
        .eq('firm_id', currentFirmId)
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
    if (!currentFirmId) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      
    }
  };

  useEffect(() => {
    if (currentFirmId) {
      loadQuotations();
      loadClients();
    } else {
      setLoading(false);
    }
  }, [currentFirmId]);

  return {
    quotations,
    clients,
    loading,
    loadQuotations,
    loadClients
  };
};
