
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number: string;
  role: string;
  current_firm_id: string | null;
  firm: any;
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

  const updateCurrentFirmInDB = useCallback(async (userId: string, firmId: string | null) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ current_firm_id: firmId })
        .eq('user_id', userId);

      if (error) throw error;
      
      if (firmId) {
        localStorage.setItem(FIRM_STORAGE_KEY, firmId);
      } else {
        localStorage.removeItem(FIRM_STORAGE_KEY);
      }
      
      return true;
    } catch (error) {
      // Error updating current firm in DB
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
        .select(`
          *,
          firm:firms!profiles_current_firm_id_fkey(*)
        `)
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle to handle no results gracefully

      if (error) {
        // Error loading profile
        return null;
      }

      if (!data) {
        
        return null;
      }

      
      
      // Validate current firm access
      if (data.current_firm_id) {
        try {
          const isValidFirm = await validateFirmAccess(data.current_firm_id, userId);
          if (!isValidFirm) {
            
            await updateCurrentFirmInDB(userId, null);
            data.current_firm_id = null;
            data.firm = null;
          }
        } catch (firmError) {
          // Error validating firm access
          // Clear invalid firm on error
          data.current_firm_id = null;
          data.firm = null;
        }
      } else {
        // Try to restore from localStorage
        const storedFirmId = localStorage.getItem(FIRM_STORAGE_KEY);
        if (storedFirmId) {
          
          try {
            const isValidFirm = await validateFirmAccess(storedFirmId, userId);
            if (isValidFirm) {
              
              await updateCurrentFirmInDB(userId, storedFirmId);
              // Recursive call to reload with updated firm
              setProfileLoading(false); // Reset loading state before recursion
              return await loadProfile(userId);
            } else {
              
              localStorage.removeItem(FIRM_STORAGE_KEY);
            }
          } catch (firmError) {
            // Error validating stored firm
            localStorage.removeItem(FIRM_STORAGE_KEY);
          }
        }
      }

      return data;
    } catch (error) {
      // Error loading profile
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [profileLoading, validateFirmAccess, updateCurrentFirmInDB]);

  const updateCurrentFirm = useCallback(async (userId: string, firmId: string | null) => {
    try {
      const success = await updateCurrentFirmInDB(userId, firmId);
      if (success) {
        if (firmId) {
          localStorage.setItem(FIRM_STORAGE_KEY, firmId);
        } else {
          localStorage.removeItem(FIRM_STORAGE_KEY);
        }
        
        return await loadProfile(userId);
      }
      return null;
    } catch (error: any) {
      // Error updating current firm
      toast({
        title: "Error updating firm",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  }, [loadProfile, updateCurrentFirmInDB, toast]);

  return {
    loadProfile,
    updateCurrentFirm,
    profileLoading,
    validateFirmAccess
  };
};
