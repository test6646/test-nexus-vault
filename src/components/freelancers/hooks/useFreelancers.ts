import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Freelancer, FreelancerFormData } from '@/types/freelancer';

export const useFreelancers = () => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error('Error loading freelancers:', error);
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
      }).catch(console.error);

      toast({
        title: "Freelancer created",
        description: `${data.full_name} has been added successfully.`,
      });

      return newFreelancer;
    } catch (error: any) {
      console.error('Error creating freelancer:', error);
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
          }).catch(console.error);
        } catch (error) {
          console.error('Error syncing freelancer update to Google Sheets:', error);
        }
      }

      toast({
        title: "Freelancer updated",
        description: "Freelancer details have been updated successfully.",
      });

      return updatedFreelancer;
    } catch (error: any) {
      console.error('Error updating freelancer:', error);
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
      const { error } = await supabase
        .from('freelancers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFreelancers(prev => prev.filter(freelancer => freelancer.id !== id));
      
      // Background sync to Google Sheets - Non-blocking
      if (currentFirmId) {
        try {
          import('@/services/googleSheetsSync').then(({ syncFreelancerInBackground }) => {
            syncFreelancerInBackground(id, currentFirmId, 'update');
          }).catch(console.error);
        } catch (error) {
          console.error('Error syncing freelancer deletion to Google Sheets:', error);
        }
      }

      toast({
        title: "Freelancer deleted",
        description: "Freelancer has been removed successfully.",
      });
    } catch (error: any) {
      console.error('Error deleting freelancer:', error);
      toast({
        title: "Error deleting freelancer",
        description: error.message,
        variant: "destructive",
      });
      throw error;
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
  };
};