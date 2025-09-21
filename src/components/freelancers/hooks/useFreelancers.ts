import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Freelancer, FreelancerFormData } from '@/types/freelancer';
import { useDeletionValidation } from '@/hooks/useDeletionValidation';
import { EnhancedConfirmationDialog } from '@/components/ui/enhanced-confirmation-dialog';

export const useFreelancers = () => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const { validateFreelancerDeletion } = useDeletionValidation();
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);
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

  const loadFreelancers = async () => {
    if (!currentFirmId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('freelancers')
        .select('*')
        .eq('firm_id', currentFirmId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFreelancers((data || []) as Freelancer[]);
    } catch (error: any) {
      
      toast({
        title: "Error loading freelancers",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createFreelancer = async (data: FreelancerFormData) => {
    if (!currentFirmId) {
      throw new Error('No firm selected');
    }

    try {
      const { data: newFreelancer, error } = await supabase
        .from('freelancers')
        .insert({
          ...data,
          firm_id: currentFirmId,
        })
        .select()
        .single();

      if (error) throw error;

      setFreelancers(prev => [newFreelancer as Freelancer, ...prev]);
      
      // Background sync to Google Sheets - Non-blocking
      import('@/services/googleSheetsSync').then(({ syncFreelancerInBackground }) => {
        syncFreelancerInBackground(newFreelancer.id, currentFirmId, 'create');
      }).catch(() => {});

      toast({
        title: "Freelancer created",
        description: `${data.full_name} has been added successfully.`,
      });

      return newFreelancer;
    } catch (error: any) {
      
      toast({
        title: "Error creating freelancer",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateFreelancer = async (id: string, data: Partial<FreelancerFormData>) => {
    try {
      const { data: updatedFreelancer, error } = await supabase
        .from('freelancers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setFreelancers(prev =>
        prev.map(freelancer =>
          freelancer.id === id ? updatedFreelancer as Freelancer : freelancer
        )
      );

      // Background sync to Google Sheets - Non-blocking
      if (currentFirmId) {
        try {
          import('@/services/googleSheetsSync').then(({ syncFreelancerInBackground }) => {
            syncFreelancerInBackground(id, currentFirmId, 'update');
          }).catch(() => {});
        } catch (error) {
          // Sync error ignored
        }
      }

      toast({
        title: "Freelancer updated",
        description: "Freelancer details have been updated successfully.",
      });

      return updatedFreelancer;
    } catch (error: any) {
      
      toast({
        title: "Error updating freelancer",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteFreelancer = async (id: string) => {
    try {
      const freelancer = freelancers.find(f => f.id === id);
      if (!freelancer) return;

      const validation = await validateFreelancerDeletion(id);
      
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
        description: `You are about to permanently delete "${freelancer.full_name}". This action cannot be undone and will permanently remove all freelancer information and history.`,
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
                    itemType: 'freelancer', 
                    itemId: id, 
                    firmId: currentFirmId 
                  }
                });
              } catch (error) {
                
                // Continue with database deletion even if Google Sheets fails
              }
            }

            // STEP 2: Delete from database
            const { error: dbError } = await supabase
              .from('freelancers')
              .delete()
              .eq('id', id);

            if (dbError) {
              throw dbError;
            }

            setFreelancers(prev => prev.filter(freelancer => freelancer.id !== id));
            
            toast({
              title: "Freelancer deleted",
              description: "Freelancer has been removed from both database and Google Sheets successfully.",
            });
            
            setConfirmDialog(prev => ({ ...prev, open: false, loading: false }));
          } catch (error: any) {
            
            toast({
              title: "Error deleting freelancer",
              description: error.message,
              variant: "destructive",
            });
            setConfirmDialog(prev => ({ ...prev, loading: false }));
            throw error;
          }
        }
      });
    } catch (error: any) {
      
      toast({
        title: "Error",
        description: "Failed to validate freelancer deletion. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadFreelancers();
  }, [currentFirmId]);

  return {
    freelancers,
    loading,
    createFreelancer,
    updateFreelancer,
    deleteFreelancer,
    refetch: loadFreelancers,
    confirmDialog,
    setConfirmDialog
  };
};