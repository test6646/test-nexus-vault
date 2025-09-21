import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, sharedStyles, SimpleTable } from '../pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

const styles = StyleSheet.create({
  ...sharedStyles,
  reportInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoText: {
    fontSize: 9,
    color: '#333333',
    fontWeight: 500,
  },
  filterInfo: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#f8f6f1',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#c4b28d',
  },
  filterText: {
    fontSize: 9,
    color: '#c4b28d',
    fontWeight: 600,
  },
  summarySection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f6f1',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c4b28d',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#c4b28d',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingVertical: 2,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: 9,
    color: '#111827',
    fontWeight: 600,
  },
});

interface SalaryReportProps {
  staffData: any[];
  freelancerData?: any[];
  reportType: 'staff' | 'freelancers' | 'all';
  totalStats: any;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const SalaryReportDocument: React.FC<SalaryReportProps> = ({ 
  staffData, 
  freelancerData = [], 
  reportType, 
  totalStats,
  firmData
}) => {
  const currentDate = formatDate(new Date());
  
  const getReportTitle = () => {
    switch (reportType) {
      case 'staff': return 'Staff Salary Report';
      case 'freelancers': return 'Freelancer Payment Report';
      case 'all': return 'Complete Salary & Payment Report';
      default: return 'Salary Report';
    }
  };

  const allData = reportType === 'all' 
    ? [...staffData, ...freelancerData.map(f => ({ ...f, type: 'freelancer' }))]
    : reportType === 'freelancers' 
      ? freelancerData 
      : staffData;

  // Split data into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const salaryChunks = [];
  const tableData = allData.map((person) => [
    person.full_name,
    person.role,
    person.total_tasks || person.total_assignments || 0,
    `₹${person.total_earnings.toLocaleString()}`,
    `₹${person.paid_amount.toLocaleString()}`,
    `₹${person.pending_amount.toLocaleString()}`
  ]);

  for (let i = 0; i < tableData.length; i += ROWS_PER_PAGE) {
    salaryChunks.push(tableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasSalaryData = allData.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={styles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={styles.title}>{getReportTitle()}</Text>

        <View style={styles.reportInfo}>
          <Text style={styles.infoText}>Generated: {currentDate}</Text>
          <Text style={styles.infoText}>Total Records: {allData.length}</Text>
        </View>

        <View style={styles.filterInfo}>
          <Text style={styles.filterText}>Report Type: {getReportTitle()}</Text>
        </View>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Staff/Freelancers:</Text>
            <Text style={styles.summaryValue}>{totalStats?.totalStaff || allData.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Earnings:</Text>
            <Text style={styles.summaryValue}>₹{(totalStats?.totalEarnings || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Paid:</Text>
            <Text style={styles.summaryValue}>₹{(totalStats?.totalPaid || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Pending:</Text>
            <Text style={styles.summaryValue}>₹{(totalStats?.totalPending || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>This Month Paid:</Text>
            <Text style={styles.summaryValue}>₹{(totalStats?.thisMonthPaid || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average per Person:</Text>
            <Text style={styles.summaryValue}>₹{(totalStats?.avgEarningsPerStaff || 0).toLocaleString()}</Text>
          </View>
        </View>
      </Page>

      {/* Salary Tables - 15 rows per page */}
      {salaryChunks.map((chunk, chunkIndex) => (
        <Page key={`salary-${chunkIndex}`} size="A4" style={styles.page}>
          <Text style={styles.title}>
            {getReportTitle()} Details {salaryChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${salaryChunks.length})` : ''}
          </Text>

          <SimpleTable
            headers={[
              'Name',
              'Role',
              reportType === 'staff' ? 'Tasks' : reportType === 'freelancers' ? 'Assignments' : 'Work Count',
              'Total Earned',
              'Paid',
              'Pending'
            ]}
            rows={chunk}
          />
        </Page>
      ))}

      {/* Final Page: Footer Only */}
      {hasSalaryData && (
        <Page size="A4" style={styles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}

      {/* If no data, add footer to first page */}
      {!hasSalaryData && (
        <Page size="A4" style={styles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}
    </Document>
  );
};

export const generateSalaryReportPDF = async (
  staffData: any[],
  freelancerData: any[],
  reportType: 'staff' | 'freelancers' | 'all',
  totalStats: any,
  firmData?: any
) => {
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
          
          if (!error) {
            firmData = firm;
          }
        }
      }
    } catch (error) {
      
    }
  }
  

  const blob = await pdf(
    <SalaryReportDocument 
      staffData={staffData} 
      freelancerData={freelancerData}
      reportType={reportType}
      totalStats={totalStats}
      firmData={firmData}
    />
  ).toBlob();
  
  const fileName = `Salary Report ${reportType ? reportType.charAt(0).toUpperCase() + reportType.slice(1) : ''} ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateSalaryReportPDF;