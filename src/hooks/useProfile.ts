
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number: string;
  role: string;
}

const FIRM_STORAGE_KEY = 'selectedFirmId';

export const useProfile = () => {
  const [profileLoading, setProfileLoading] = useState(false);
  const { toast } = useToast();

  const validateFirmAccess = useCallback(async (firmId: string, userId: string): Promise<boolean> => {
    try {
      const { data: firm, error: firmError } = await supabase
        .from('firms')
        .select('id, created_by')
        .eq('id', firmId)
        .single();

      if (firmError) {
        
        return false;
      }

      if (firm.created_by === userId) {
        return true;
      }

      const { data: membership, error: memberError } = await supabase
        .from('firm_members')
        .select('id')
        .eq('firm_id', firmId)
        .eq('user_id', userId)
        .single();

      return !memberError && !!membership;
    } catch (error) {
      // Error validating firm access
      return false;
    }
  }, []);


  const loadProfile = useCallback(async (userId: string): Promise<ProfileData | null> => {
    if (profileLoading) {
      
      return null;
    }
    
    try {
      setProfileLoading(true);
      
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        return null;
      }

      if (!data) {
        return null;
      }

      return data;
    } catch (error) {
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [profileLoading]);

  const updateCurrentFirm = useCallback(async (userId: string, firmId: string | null) => {
    try {
      if (firmId) {
        localStorage.setItem(FIRM_STORAGE_KEY, firmId);
      } else {
        localStorage.removeItem(FIRM_STORAGE_KEY);
      }
      
      return await loadProfile(userId);
    } catch (error: any) {
      // Error updating current firm
      toast({
        title: "Error updating firm",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  }, [loadProfile, toast]);

  return {
    loadProfile,
    updateCurrentFirm,
    profileLoading
  };
};
