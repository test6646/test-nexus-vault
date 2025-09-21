import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Firm {
  id: string;
  name: string;
  created_by: string;
  logo_url?: string;
  description?: string;
}

const FIRM_STORAGE_KEY = 'selectedFirmId';

const getUserFirmKey = (userId: string) => `${FIRM_STORAGE_KEY}_${userId}`;

export const useFirmState = (userId?: string) => {
  const [currentFirmId, setCurrentFirmId] = useState<string | null>(() => {
    // Only get from localStorage if we have a userId and it's valid
    if (!userId) return null;
    const stored = localStorage.getItem(getUserFirmKey(userId));
    return stored || null;
  });
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(false);
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
      return false;
    }
  }, []);

  const loadFirms = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get firms where user is the creator
      const { data: ownedFirms, error: ownedError } = await supabase
        .from('firms')
        .select('*')
        .eq('created_by', userId);

      if (ownedError) {
        // Don't fail completely, try to continue
      }

      // Get firms where user is a member
      const { data: memberFirms, error: memberError } = await supabase
        .from('firm_members')
        .select(`
          firm_id,
          firms!inner(*)
        `)
        .eq('user_id', userId);

      if (memberError && memberError.code !== 'PGRST116') {
        // Don't fail completely, try to continue
      }

      // Combine and deduplicate firms
      const allFirms = [
        ...(ownedFirms || []),
        ...(memberFirms?.map(m => m.firms).filter(Boolean) || [])
      ];

      const uniqueFirms = allFirms.filter((firm, index, self) => 
        index === self.findIndex(f => f.id === firm.id)
      );

      setFirms(uniqueFirms);

      // Validate current firm access
      if (currentFirmId) {
        try {
          const isValid = await validateFirmAccess(currentFirmId, userId);
          if (!isValid) {
            setCurrentFirmId(null);
            localStorage.removeItem(getUserFirmKey(userId));
          }
        } catch (validateError) {
          // Clear invalid firm on validation error
          setCurrentFirmId(null);
          localStorage.removeItem(getUserFirmKey(userId));
        }
      }

      // If no current firm is selected but firms exist, select the first one
      if (!currentFirmId && uniqueFirms.length > 0) {
        const firstFirmId = uniqueFirms[0].id;
        setCurrentFirmId(firstFirmId);
        localStorage.setItem(getUserFirmKey(userId), firstFirmId);
      }
    } catch (error: any) {
      // Don't show toast for auth errors to avoid spam
      if (!error.message?.includes('refresh_token') && !error.message?.includes('JWT')) {
        toast({
          title: "Error loading firms",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [userId, currentFirmId, validateFirmAccess, toast]);

  const updateCurrentFirm = useCallback((firmId: string | null) => {
    if (!userId) return;
    setCurrentFirmId(firmId);
    if (firmId) {
      localStorage.setItem(getUserFirmKey(userId), firmId);
    } else {
      localStorage.removeItem(getUserFirmKey(userId));
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadFirms();
    } else {
      setLoading(false);
      setFirms([]);
      setCurrentFirmId(null);
      // Clear all firm-related storage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(FIRM_STORAGE_KEY)) {
          localStorage.removeItem(key);
        }
      });
    }
  }, [userId, loadFirms]);

  const currentFirm = firms.find(f => f.id === currentFirmId);

  return {
    currentFirmId,
    currentFirm,
    firms,
    loading,
    updateCurrentFirm,
    loadFirms,
    validateFirmAccess
  };
};