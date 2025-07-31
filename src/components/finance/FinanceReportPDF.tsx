
import { Document, Page, Text, View, StyleSheet, Image, pdf, Font } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

// Register Lexend font from local file
Font.register({
  family: 'Lexend',
  src: '/fonts/Lexend.ttf',
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 24,
    fontFamily: 'Lexend',
    fontSize: 10,
    lineHeight: 1.3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#c4b28d',
  },
  logo: {
    width: 100,
    height: 50,
  },
  companyInfo: {
    alignItems: 'flex-end',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 3,
  },
  tagline: {
    fontSize: 9,
    color: '#666666',
    fontWeight: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: 'center',
    color: '#c4b28d',
    marginBottom: 20,
    padding: 8,
    backgroundColor: '#f8f6f1',
    borderRadius: 4,
  },
  reportInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 4,
  },
  infoText: {
    fontSize: 10,
    color: '#333333',
  },
  table: {
    marginVertical: 12,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#c4b28d',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 10,
    fontWeight: 600,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    color: '#333333',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 9,
    textAlign: 'right',
    fontWeight: 500,
    color: '#333333',
    paddingHorizontal: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    textAlign: 'center',
    fontSize: 8,
    color: '#888888',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
  },
  summarySection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f6f1',
    borderWidth: 1,
    borderColor: '#c4b28d',
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#c4b28d',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#333333',
    fontWeight: 500,
  },
  summaryValue: {
    fontSize: 10,
    color: '#333333',
    fontWeight: 600,
  },
});

interface FinanceReportProps {
  stats: any;
  timeRange: string;
}

const FinanceReportDocument: React.FC<FinanceReportProps> = ({ stats, timeRange }) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const currentDate = new Date().toLocaleDateString();
  
  const tableData = [
    { metric: 'Payment In', value: formatCurrency(stats?.paymentIn || 0), type: 'income' },
    { metric: 'Payment Out', value: formatCurrency(stats?.paymentOut || 0), type: 'expense' },
    { metric: 'Total Expenses', value: formatCurrency(stats?.totalExpenses || 0), type: 'expense' },
    { metric: 'Total Revenue', value: formatCurrency(stats?.totalRevenue || 0), type: 'income' },
    { metric: 'Pending Amount', value: formatCurrency(stats?.pendingAmount || 0), type: 'pending' },
    { metric: 'Active Events', value: stats?.activeEvents?.toString() || '0', type: 'count' },
    { metric: 'Completed Events', value: stats?.completedEvents?.toString() || '0', type: 'count' },
    { metric: 'Pending Tasks', value: stats?.pendingTasks?.toString() || '0', type: 'count' },
  ];

  const netProfit = (stats?.paymentIn || 0) - (stats?.totalExpenses || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>Prit Photo Studio</Text>
            <Text style={styles.tagline}>Professional Photography & Videography Services</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>FINANCIAL REPORT</Text>

        {/* Report Info */}
        <View style={styles.reportInfo}>
          <Text style={styles.infoText}>Report Period: {timeRange}</Text>
          <Text style={styles.infoText}>Generated on: {currentDate}</Text>
        </View>

        {/* Financial Data Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCellHeader}>Metric</Text>
            <Text style={styles.tableCellHeader}>Value</Text>
            <Text style={styles.tableCellHeader}>Category</Text>
          </View>
          
          {tableData.map((row, index) => (
            <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={styles.tableCell}>{row.metric}</Text>
              <Text style={styles.tableCellAmount}>{row.value}</Text>
              <Text style={styles.tableCell}>
                {row.type === 'income' ? 'Income' : 
                 row.type === 'expense' ? 'Expense' : 
                 row.type === 'pending' ? 'Pending' : 'Count'}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Net Profit/Loss:</Text>
            <Text style={[styles.summaryValue, { color: netProfit >= 0 ? '#c4b28d' : '#DC3545' }]}>
              {formatCurrency(netProfit)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Business Volume:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(stats?.totalRevenue || 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Active Projects:</Text>
            <Text style={styles.summaryValue}>{stats?.activeEvents || 0} Events</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          This report was automatically generated by Studio Management System{'\n'}
          Report generated on {currentDate} for period: {timeRange}
        </Text>
      </Page>
    </Document>
  );
};

const generateFinanceReportPDF = async (stats: any, timeRange: string) => {
  const blob = await pdf(<FinanceReportDocument stats={stats} timeRange={timeRange} />).toBlob();
  const fileName = `financial-report-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateFinanceReportPDF;