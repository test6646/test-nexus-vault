import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface FirmData {
  name: string;
  description?: string;
  logo_url?: string;
  header_left_content?: string;
  footer_content?: string;
}

export const useFirmData = () => {
  const { currentFirmId } = useAuth();
  const [firmData, setFirmData] = useState<FirmData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFirmData = async () => {
    if (!currentFirmId) {
      setFirmData(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('firms')
        .select('name, description, logo_url, header_left_content, footer_content')
        .eq('id', currentFirmId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching firm data:', error);
        setFirmData(null);
        return;
      }
      setFirmData(data || null);
    } catch (error) {
      console.error('Error fetching firm data:', error);
      setFirmData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFirmData();
  }, [currentFirmId]);

  return { firmData, loading, refetch: fetchFirmData };
};