import generateFinanceReportPDF from '@/components/finance/FinanceReportPDF';
import { supabase } from '@/integrations/supabase/client';

export const generateFinancialReportPDF = async (data: any, filterType: string, filterValue: string, firmData?: any) => {
  // Use provided firmData or fetch it if not provided
  if (!firmData) {
    try {
      // Try to get current user and their firm
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Try multiple ways to get firm ID
        const userFirmKey = `selectedFirmId_${user.id}`;
        let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
        
        // If no localStorage, try getting from profile
        if (!firmId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_firm_id, firm_id')
            .eq('user_id', user.id)
            .single();
          
          firmId = profile?.current_firm_id || profile?.firm_id;
        }
        
        if (firmId) {
          const { data: firm, error } = await supabase
            .from('firms')
            .select('name, description, logo_url, header_left_content, footer_content')
            .eq('id', firmId)
            .single();
          
          if (!error && firm) {
            firmData = firm;
          }
        }
      }
    } catch (error) {
      // Error fetching firm data for PDF
    }
  }

  // Extract the financial stats from data - could be array or object
  const statsData = Array.isArray(data) ? data[0] : data;
  
  // Map filterType appropriately for the finance PDF
  let timeRange = 'month';
  if (filterType === 'all') timeRange = 'global';
  else if (filterType === 'payment_type') timeRange = 'month';
  else if (filterType === 'status') timeRange = 'month';
  else if (filterType === 'event') timeRange = 'month';
  
  await generateFinanceReportPDF(statsData, timeRange, firmData);
};