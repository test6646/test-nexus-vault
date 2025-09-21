import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface FirmData {
  name: string;
  description?: string;
  tagline?: string;
  contact_phone?: string;
  contact_email?: string;
  logo_url?: string;
  header_left_content?: string;
  footer_content?: string;
  spreadsheet_id?: string;
  calendar_id?: string;
  upi_id?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_name?: string;
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
        .select('*')
        .eq('id', currentFirmId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching firm data:', error);
        setFirmData(null);
        return;
      }
      setFirmData(data as FirmData || null);
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