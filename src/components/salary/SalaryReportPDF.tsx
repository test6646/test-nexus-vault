import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { formatDate } from '@/lib/date-utils';

Font.register({
  family: 'Lexend',
  src: '/fonts/Lexend.ttf',
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 32,
    fontFamily: 'Lexend',
    fontSize: 10,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#c4b28d',
  },
  companyInfo: {
    alignItems: 'flex-start',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 4,
  },
  contactSection: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  contactText: {
    fontSize: 8,
    color: '#666666',
    marginBottom: 2,
    textAlign: 'right',
  },
  hashtagText: {
    fontSize: 7,
    color: '#c4b28d',
    fontWeight: 600,
    marginTop: 2,
    textAlign: 'right',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    color: '#c4b28d',
    marginBottom: 24,
    padding: 8,
    backgroundColor: '#f8f6f1',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c4b28d',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
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
  table: {
    marginVertical: 16,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#c4b28d',
    padding: 10,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 9,
    fontWeight: 600,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    color: '#4B5563',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableCellName: {
    flex: 2,
    fontSize: 8,
    color: '#111827',
    textAlign: 'left',
    paddingHorizontal: 4,
    fontWeight: 500,
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 8,
    color: '#111827',
    textAlign: 'right',
    paddingHorizontal: 4,
    fontWeight: 500,
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
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 8,
    color: '#9CA3AF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
});

interface SalaryReportProps {
  staffData: any[];
  freelancerData?: any[];
  reportType: 'staff' | 'freelancers' | 'all';
  totalStats: any;
}

const SalaryReportDocument: React.FC<SalaryReportProps> = ({ 
  staffData, 
  freelancerData = [], 
  reportType, 
  totalStats 
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
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>PRIT PHOTO</Text>
          </View>
          <View style={styles.contactSection}>
            <Text style={styles.contactText}>Contact: +91 72850 72603</Text>
            <Text style={styles.contactText}>Email: pritphoto1985@gmail.com</Text>
            <Text style={styles.hashtagText}>#aJourneyOfLoveByPritPhoto</Text>
          </View>
        </View>

        <Text style={styles.title}>{getReportTitle()}</Text>

        <View style={styles.reportInfo}>
          <Text style={styles.infoText}>Generated: {currentDate}</Text>
          <Text style={styles.infoText}>Total Records: {allData.length}</Text>
        </View>

        <View style={styles.filterInfo}>
          <Text style={styles.filterText}>Report Type: {getReportTitle()}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { flex: 2 }]}>Name</Text>
            <Text style={styles.tableCellHeader}>Role</Text>
            {reportType === 'staff' && <Text style={styles.tableCellHeader}>Tasks</Text>}
            {reportType === 'freelancers' && <Text style={styles.tableCellHeader}>Assignments</Text>}
            {reportType === 'all' && <Text style={styles.tableCellHeader}>Work Count</Text>}
            <Text style={styles.tableCellHeader}>Total Earned</Text>
            <Text style={styles.tableCellHeader}>Paid</Text>
            <Text style={styles.tableCellHeader}>Pending</Text>
          </View>
          
          {allData.slice(0, 20).map((person, index) => (
            <View key={person.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellName, { flex: 2 }]}>{person.full_name}</Text>
              <Text style={styles.tableCell}>{person.role}</Text>
              <Text style={styles.tableCell}>
                {person.total_tasks || person.total_assignments || 0}
              </Text>
              <Text style={styles.tableCellAmount}>₹{person.total_earnings.toLocaleString()}</Text>
              <Text style={styles.tableCellAmount}>₹{person.paid_amount.toLocaleString()}</Text>
              <Text style={styles.tableCellAmount}>₹{person.pending_amount.toLocaleString()}</Text>
            </View>
          ))}
        </View>


        <Text style={styles.footer}>
          PRIT PHOTO | Contact: +91 72850 72603 | Email: pritphoto1985@gmail.com{'\n'}
          #aJourneyOfLoveByPritPhoto | Your memories, our passion
        </Text>
      </Page>

      {/* Continue table if there are more records */}
      {allData.length > 20 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>PRIT PHOTO</Text>
            </View>
            <View style={styles.contactSection}>
              <Text style={styles.contactText}>Contact: +91 72850 72603</Text>
              <Text style={styles.contactText}>Email: pritphoto1985@gmail.com</Text>
              <Text style={styles.hashtagText}>#aJourneyOfLoveByPritPhoto</Text>
            </View>
          </View>

          <Text style={styles.title}>{getReportTitle()} - Continued</Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 2 }]}>Name</Text>
              <Text style={styles.tableCellHeader}>Role</Text>
              {reportType === 'staff' && <Text style={styles.tableCellHeader}>Tasks</Text>}
              {reportType === 'freelancers' && <Text style={styles.tableCellHeader}>Assignments</Text>}
              {reportType === 'all' && <Text style={styles.tableCellHeader}>Work Count</Text>}
              <Text style={styles.tableCellHeader}>Total Earned</Text>
              <Text style={styles.tableCellHeader}>Paid</Text>
              <Text style={styles.tableCellHeader}>Pending</Text>
            </View>
            
            {allData.slice(20, 40).map((person, index) => (
              <View key={person.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCellName, { flex: 2 }]}>{person.full_name}</Text>
                <Text style={styles.tableCell}>{person.role}</Text>
                <Text style={styles.tableCell}>
                  {person.total_tasks || person.total_assignments || 0}
                </Text>
                <Text style={styles.tableCellAmount}>₹{person.total_earnings.toLocaleString()}</Text>
                <Text style={styles.tableCellAmount}>₹{person.paid_amount.toLocaleString()}</Text>
                <Text style={styles.tableCellAmount}>₹{person.pending_amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            PRIT PHOTO | Contact: +91 72850 72603 | Email: pritphoto1985@gmail.com{'\n'}
            #aJourneyOfLoveByPritPhoto | Your memories, our passion
          </Text>
        </Page>
      )}

      {/* Financial Summary on Separate Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>PRIT PHOTO</Text>
          </View>
          <View style={styles.contactSection}>
            <Text style={styles.contactText}>Contact: +91 72850 72603</Text>
            <Text style={styles.contactText}>Email: pritphoto1985@gmail.com</Text>
            <Text style={styles.hashtagText}>#aJourneyOfLoveByPritPhoto</Text>
          </View>
        </View>

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

        <Text style={styles.footer}>
          PRIT PHOTO | Contact: +91 72850 72603 | Email: pritphoto1985@gmail.com{'\n'}
          #aJourneyOfLoveByPritPhoto | Your memories, our passion
        </Text>
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
  const blob = await pdf(
    <SalaryReportDocument 
      staffData={staffData} 
      freelancerData={freelancerData}
      reportType={reportType}
      totalStats={totalStats}
    />
  ).toBlob();
  
  const fileName = `salary-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateSalaryReportPDF;