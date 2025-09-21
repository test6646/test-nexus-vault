import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

interface QuotationReportProps {
  quotations: any[];
  filterType: string;
  filterValue: string;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const QuotationReportDocument: React.FC<QuotationReportProps> = ({ quotations, filterType, filterValue, firmData }) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const currentDate = formatDate(new Date());
  
  const quotationStats = {
    total: quotations.length,
    totalAmount: quotations.reduce((sum, quotation) => sum + (quotation.amount || 0), 0),
    avgAmount: quotations.length > 0 ? quotations.reduce((sum, quotation) => sum + (quotation.amount || 0), 0) / quotations.length : 0,
    convertedCount: quotations.filter((q: any) => q.converted_to_event).length,
  };

  const getFilterDisplayText = () => {
    if (filterType === 'all') return 'All Quotations';
    if (filterType === 'event_type') return `Event Type: ${filterValue}`;
    if (filterType === 'status') {
      const statusLabels: Record<string, string> = {
        'upcoming': 'Upcoming Quotations',
        'past': 'Past Quotations',
        'converted': 'Converted to Event',
        'pending': 'Pending Quotations'
      };
      return statusLabels[filterValue] || filterValue;
    }
    if (filterType === 'event') return `Event Filter: ${filterValue}`;
    return filterValue || 'All Quotations';
  };

  const tableData = quotations.map(quotation => [
    quotation.title || 'N/A',
    quotation.client?.name || 'N/A',
    quotation.event_type || 'N/A',
    formatDate(new Date(quotation.event_date)),
    formatCurrency(quotation.amount || 0),
    quotation.converted_to_event ? 'Converted' : 'Pending'
  ]);

  // Split quotations into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const quotationChunks = [];
  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    quotationChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasQuotations = quotations.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Quotation Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Quotations:</Text>
              <Text style={sharedStyles.detailValue}>{quotationStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
          
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(quotationStats.totalAmount)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Average Amount:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(quotationStats.avgAmount)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Converted to Events:</Text>
              <Text style={sharedStyles.detailValue}>{quotationStats.convertedCount}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Pending Quotations:</Text>
              <Text style={sharedStyles.detailValue}>{quotationStats.total - quotationStats.convertedCount}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Quotation Tables - 15 rows per page */}
      {quotationChunks.map((chunk, chunkIndex) => (
        <Page key={`quotation-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Quotation Details {quotationChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${quotationChunks.length})` : ''}
          </Text>
          
          <SimpleTable
            headers={['Title', 'Client', 'Event Type', 'Event Date', 'Amount', 'Status']}
            rows={chunk}
          />
        </Page>
      ))}

      {/* Final Page: Footer Only */}
      {hasQuotations && (
        <Page size="A4" style={sharedStyles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}

      {/* If no quotations, add footer to first page */}
      {!hasQuotations && (
        <Page size="A4" style={sharedStyles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}
    </Document>
  );
};

export const generateQuotationReportPDF = async (data: any[], filterType: string, filterValue: string, firmData?: any) => {
  // If quotations array is limited (pagination), fetch all quotations for PDF
  let allQuotations = data;
  
  if (data.length === 50 || data.length === 25) {
    // Likely paginated data, fetch all quotations
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userFirmKey = `selectedFirmId_${user.id}`;
        let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
        
        if (!firmId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_firm_id, firm_id')
            .eq('user_id', user.id)
            .single();
          firmId = profile?.current_firm_id || profile?.firm_id;
        }
        
        if (firmId) {
          // Fetch ALL quotations for this firm
          let allData: any[] = [];
          let hasMore = true;
          let page = 0;
          const pageSize = 1000;
          
          while (hasMore) {
            const { data, error } = await supabase
              .from('quotations')
              .select('*, client:clients(*)')
              .eq('firm_id', firmId)
              .range(page * pageSize, (page + 1) * pageSize - 1);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
              allData = [...allData, ...data];
              hasMore = data.length === pageSize;
              page++;
            } else {
              hasMore = false;
            }
            
            if (page > 100) break; // Safety limit
          }
          
          allQuotations = allData;
        }
      }
    } catch (error) {
      console.error('Error fetching all quotations for PDF:', error);
      // Use provided data as fallback
    }
  }

  // Use provided firmData or fetch it if not provided
  if (!firmData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const userFirmKey = `selectedFirmId_${user.id}`;
        let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
        
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

  const blob = await pdf(<QuotationReportDocument quotations={allQuotations} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Quotation Report ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};