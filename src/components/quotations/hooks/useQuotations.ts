
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Quotation, Client, EventType } from '@/types/studio';
import { useDeletionValidation } from '@/hooks/useDeletionValidation';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';


export const useQuotations = () => {
  const { profile, currentFirmId } = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { validateQuotationDeletion } = useDeletionValidation();
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
    variant: 'default' as 'destructive' | 'warning' | 'default',
    requireTextConfirmation: false,
    confirmationKeyword: '',
    loading: false
  });

  const loadQuotations = async () => {
    if (!currentFirmId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          client:clients(*),
          event:events(id, title)
        `)
        .eq('firm_id', currentFirmId)
        .is('converted_to_event', null)
        .or(`valid_until.is.null,valid_until.gte.${today}`)
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

  const deleteQuotation = async (id: string) => {
    try {
      const quotation = quotations.find(q => q.id === id);
      if (!quotation) return;

      const validation = await validateQuotationDeletion(id);
      
      if (!validation.canDelete) {
        setConfirmDialog({
          open: true,
          title: validation.title,
          description: validation.description,
          variant: 'warning',
          requireTextConfirmation: false,
          confirmationKeyword: '',
          loading: false,
          onConfirm: () => {
            setConfirmDialog(prev => ({ ...prev, open: false }));
          }
        });
        return;
      }

      setConfirmDialog({
        open: true,
        title: validation.title,
        description: `You are about to permanently delete "${quotation.title}". This action cannot be undone and will permanently remove all quotation details and history.`,
        variant: 'destructive',
        requireTextConfirmation: true,
        confirmationKeyword: 'DELETE',
        loading: false,
        onConfirm: async () => {
          setConfirmDialog(prev => ({ ...prev, loading: true }));
          
          try {
            // STEP 1: Delete from Google Sheets FIRST
            if (currentFirmId) {
              try {
                await supabase.functions.invoke('delete-item-from-google', {
                  body: { 
                    itemType: 'quotation', 
                    itemId: id, 
                    firmId: currentFirmId 
                  }
                });
              } catch (error) {
                console.warn('⚠️ Failed to delete quotation from Google Sheets:', error);
                // Continue with database deletion even if Google Sheets fails
              }
            }

            // STEP 2: Delete from database
            const { error: dbError } = await supabase
              .from('quotations')
              .delete()
              .eq('id', id);

            if (dbError) {
              throw dbError;
            }

            setQuotations(prev => prev.filter(quotation => quotation.id !== id));
            
            toast({
              title: "Quotation deleted",
              description: "Quotation has been removed successfully.",
            });
            
            setConfirmDialog(prev => ({ ...prev, open: false, loading: false }));
          } catch (error: any) {
            console.error('Error deleting quotation:', error);
            toast({
              title: "Error deleting quotation",
              description: error.message,
              variant: "destructive",
            });
            setConfirmDialog(prev => ({ ...prev, loading: false }));
            throw error;
          }
        }
      });
    } catch (error: any) {
      console.error('Error validating quotation deletion:', error);
      toast({
        title: "Error",
        description: "Failed to validate quotation deletion. Please try again.",
        variant: "destructive",
      });
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
    loadClients,
    deleteQuotation,
    confirmDialog,
    setConfirmDialog
  };
};
