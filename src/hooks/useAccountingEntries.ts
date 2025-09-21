import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AccountingCategory = Database['public']['Enums']['accounting_category'];

export interface AccountingEntry {
  id: string;
  firm_id: string;
  category: AccountingCategory;
  subcategory?: string;
  title: string;
  description?: string;
  amount: number;
  entry_type: string;
  entry_date: string;
  payment_method?: string;
  document_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  reflect_to_company: boolean;
}

export const useAccountingEntries = () => {
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentFirmId, profile } = useAuth();
  const { toast } = useToast();

  const fetchEntries = async () => {
    if (!currentFirmId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('entry_date', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching accounting entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch accounting entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createEntry = async (entryData: Omit<AccountingEntry, 'id' | 'created_at' | 'updated_at' | 'firm_id' | 'created_by'>) => {
    if (!currentFirmId || !profile) return;

    try {
      const { data, error } = await supabase
        .from('accounting_entries')
        .insert([{
          ...entryData,
          firm_id: currentFirmId,
          created_by: profile.id,
        }])
        .select()
        .single();

      if (error) throw error;

      setEntries(prev => [data, ...prev]);
      
      // Sync to Google Sheets in background
      if (currentFirmId) {
        import('@/services/googleSheetsSync').then(({ syncAccountingInBackground }) => {
          syncAccountingInBackground(data.id, currentFirmId, 'create');
        }).catch(console.error);
      }
      
      // Trigger refetch to ensure latest data
      setTimeout(() => {
        fetchEntries();
      }, 100);
      
      toast({
        title: "Success",
        description: "Accounting entry created successfully",
      });
      return data;
    } catch (error) {
      console.error('Error creating accounting entry:', error);
      toast({
        title: "Error",
        description: "Failed to create accounting entry",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateEntry = async (id: string, updates: Partial<AccountingEntry>) => {
    try {
      // First update database
      const { data, error } = await supabase
        .from('accounting_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setEntries(prev => prev.map(entry => entry.id === id ? data : entry));
      
      // Sync to Google Sheets in background
      if (currentFirmId) {
        import('@/services/googleSheetsSync').then(({ syncAccountingInBackground }) => {
          syncAccountingInBackground(id, currentFirmId, 'update');
        }).catch(console.error);
      }
      
      toast({
        title: "Success",
        description: "Accounting entry updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating accounting entry:', error);
      toast({
        title: "Error",
        description: "Failed to update accounting entry",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('accounting_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.filter(entry => entry.id !== id));
      
      // Sync to Google Sheets in background
      if (currentFirmId) {
        import('@/services/googleSheetsSync').then(({ syncAccountingInBackground }) => {
          syncAccountingInBackground(id, currentFirmId, 'delete');
        }).catch(console.error);
      }
      
      toast({
        title: "Success",
        description: "Accounting entry deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting accounting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete accounting entry",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [currentFirmId]);

  return {
    entries,
    loading,
    createEntry,
    updateEntry,
    deleteEntry,
    refetch: fetchEntries,
  };
};