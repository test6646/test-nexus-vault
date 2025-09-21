import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

interface ClientReportProps {
  clients: any[];
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

const ClientReportDocument: React.FC<ClientReportProps> = ({ clients, filterType, filterValue, firmData }) => {
  const formatPhoneNumber = (phone: string) => phone || 'N/A';
  const currentDate = formatDate(new Date());
  
  const clientStats = {
    total: clients.length,
    withEvents: clients.filter(client => client.events && client.events.length > 0).length,
    withEmail: clients.filter(client => client.email).length,
    withAddress: clients.filter(client => client.address).length,
  };

  const getFilterDisplayText = () => {
    if (filterType === 'all') return 'All Clients';
    if (filterType === 'event') return `Event-wise Clients: ${filterValue}`;
    return filterValue;
  };

  const tableData = clients.map(client => [
    client.name,
    formatPhoneNumber(client.phone),
    client.email || 'N/A',
    client.address || 'N/A',
    formatDate(new Date(client.created_at))
  ]);

  // Split clients into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const clientChunks = [];
  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    clientChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasClients = clients.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Client Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Clients:</Text>
              <Text style={sharedStyles.detailValue}>{clientStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
          
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Client Statistics</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Clients with Events:</Text>
              <Text style={sharedStyles.detailValue}>{clientStats.withEvents}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Clients with Email:</Text>
              <Text style={sharedStyles.detailValue}>{clientStats.withEmail}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Clients with Address:</Text>
              <Text style={sharedStyles.detailValue}>{clientStats.withAddress}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Client Tables - 15 rows per page */}
      {clientChunks.map((chunk, chunkIndex) => (
        <Page key={`client-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Client Details {clientChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${clientChunks.length})` : ''}
          </Text>
          
          <SimpleTable
            headers={['Name', 'Phone', 'Email', 'Address', 'Added On']}
            rows={chunk}
          />
        </Page>
      ))}

      {/* Final Page: Footer Only */}
      {hasClients && (
        <Page size="A4" style={sharedStyles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}

      {/* If no clients, add footer to first page */}
      {!hasClients && (
        <Page size="A4" style={sharedStyles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}
    </Document>
  );
};

export const generateClientReportPDF = async (clients: any[], filterType: string, filterValue: string, firmData?: any) => {
  // If clients array is limited (pagination), fetch all clients for PDF
  let allClients = clients;
  
  if (clients.length === 50 || clients.length === 25) {
    // Likely paginated data, fetch all clients
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
          // Fetch ALL clients for this firm
          let allData: any[] = [];
          let hasMore = true;
          let page = 0;
          const pageSize = 1000;
          
          while (hasMore) {
            const { data, error } = await supabase
              .from('clients')
              .select('*')
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
          
          allClients = allData;
        }
      }
    } catch (error) {
      console.error('Error fetching all clients for PDF:', error);
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

  const blob = await pdf(<ClientReportDocument clients={allClients} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `Client Report ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateClientReportPDF;