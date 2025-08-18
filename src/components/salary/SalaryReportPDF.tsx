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

  const shouldBreakPage = allData.length > 15; // Break page if more than 15 records

  return (
    <Document>
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

        <SimpleTable
          headers={[
            'Name',
            'Role',
            reportType === 'staff' ? 'Tasks' : reportType === 'freelancers' ? 'Assignments' : 'Work Count',
            'Total Earned',
            'Paid',
            'Pending'
          ]}
          rows={allData.slice(0, 20).map((person) => [
            person.full_name,
            person.role,
            person.total_tasks || person.total_assignments || 0,
            `₹${person.total_earnings.toLocaleString()}`,
            `₹${person.paid_amount.toLocaleString()}`,
            `₹${person.pending_amount.toLocaleString()}`
          ])}
        />


        <SharedPDFFooter firmData={firmData} />
      </Page>

      {/* Continue table if there are more records */}
      {allData.length > 20 && (
        <Page size="A4" style={styles.page}>
          <SharedPDFHeader firmData={firmData} />

          <Text style={styles.title}>{getReportTitle()} - Continued</Text>

          <SimpleTable
            headers={[
              'Name',
              'Role',
              reportType === 'staff' ? 'Tasks' : reportType === 'freelancers' ? 'Assignments' : 'Work Count',
              'Total Earned',
              'Paid',
              'Pending'
            ]}
            rows={allData.slice(20, 40).map((person) => [
              person.full_name,
              person.role,
              person.total_tasks || person.total_assignments || 0,
              `₹${person.total_earnings.toLocaleString()}`,
              `₹${person.paid_amount.toLocaleString()}`,
              `₹${person.pending_amount.toLocaleString()}`
            ])}
          />

          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}

      {/* Financial Summary on Separate Page */}
      <Page size="A4" style={styles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={styles.title}>FINANCIAL SUMMARY</Text>

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

        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const generateSalaryReportPDF = async (
  staffData: any[],
  freelancerData: any[],
  reportType: 'staff' | 'freelancers' | 'all',
  totalStats: any
) => {
  // Get firm data using localStorage firm ID (same pattern as other PDFs)
  let firmData = null;
  try {
    const firmId = localStorage.getItem('selectedFirmId');
    if (firmId) {
      const { data: firm } = await supabase
        .from('firms')
        .select('name, description, logo_url, header_left_content, footer_content')
        .eq('id', firmId)
        .maybeSingle();
      
      firmData = firm;
    }
  } catch (error) {
    // Error fetching firm data for PDF
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
  
  const fileName = `salary-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateSalaryReportPDF;