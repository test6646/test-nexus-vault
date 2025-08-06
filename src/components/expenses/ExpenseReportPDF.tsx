import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Expense } from '@/types/studio';
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
  tagline: {
    fontSize: 10,
    color: '#666666',
    fontWeight: 400,
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
    justifyContent: 'space-between',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    justifyContent: 'space-between',
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
  tableCellDesc: {
    flex: 2,
    fontSize: 8,
    color: '#111827',
    textAlign: 'left',
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

interface ExpenseReportProps {
  expenses: Expense[];
  filterType: string;
  filterValue: string;
}

const ExpenseReportDocument: React.FC<ExpenseReportProps> = ({ expenses, filterType, filterValue }) => {
  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const currentDate = formatDate(new Date());
  
  const expenseStats = {
    total: expenses.length,
    totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    avgAmount: expenses.length > 0 ? expenses.reduce((sum, expense) => sum + expense.amount, 0) / expenses.length : 0,
  };

  const getFilterDisplayText = () => {
    if (filterType === 'global') return 'All Expenses';
    if (filterType === 'category') return `Category: ${filterValue}`;
    if (filterType === 'staff') return `Staff: ${filterValue}`;
    return filterValue;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>PRIT PHOTO</Text>
          </View>
          <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: '#666666', marginBottom: 2, textAlign: 'right' }}>Contact: +91 72850 72603</Text>
            <Text style={{ fontSize: 8, color: '#666666', marginBottom: 2, textAlign: 'right' }}>Email: pritphoto1985@gmail.com</Text>
            <Text style={{ fontSize: 7, color: '#c4b28d', fontWeight: 600, marginTop: 2, textAlign: 'right' }}>#aJourneyOfLoveByPritPhoto</Text>
          </View>
        </View>

        <Text style={styles.title}>Expense Report</Text>

        <View style={styles.reportInfo}>
          <Text style={styles.infoText}>Generated: {currentDate}</Text>
          <Text style={styles.infoText}>Total Expenses: {expenseStats.total}</Text>
        </View>

        <View style={styles.filterInfo}>
          <Text style={styles.filterText}>Filter: {getFilterDisplayText()}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, { flex: 2 }]}>Description</Text>
            <Text style={styles.tableCellHeader}>Category</Text>
            <Text style={styles.tableCellHeader}>Date</Text>
            <Text style={styles.tableCellHeader}>Amount</Text>
          </View>
          
          {expenses.slice(0, 25).map((expense, index) => (
            <View key={expense.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCellDesc, { flex: 2 }]}>{expense.description}</Text>
              <Text style={styles.tableCell}>{expense.category}</Text>
              <Text style={styles.tableCell}>
                {formatDate(new Date(expense.expense_date))}
              </Text>
              <Text style={styles.tableCell}>
                {formatCurrency(expense.amount)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          PRIT PHOTO | Contact: +91 72850 72603 | Email: pritphoto1985@gmail.com{'\n'}
          #aJourneyOfLoveByPritPhoto | Your memories, our passion
        </Text>
      </Page>

      {/* Summary on Separate Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>PRIT PHOTO</Text>
          </View>
          <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 8, color: '#666666', marginBottom: 2, textAlign: 'right' }}>Contact: +91 72850 72603</Text>
            <Text style={{ fontSize: 8, color: '#666666', marginBottom: 2, textAlign: 'right' }}>Email: pritphoto1985@gmail.com</Text>
            <Text style={{ fontSize: 7, color: '#c4b28d', fontWeight: 600, marginTop: 2, textAlign: 'right' }}>#aJourneyOfLoveByPritPhoto</Text>
          </View>
        </View>

        <Text style={styles.title}>EXPENSE SUMMARY</Text>

        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Expenses:</Text>
            <Text style={styles.summaryValue}>{expenseStats.total}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(expenseStats.totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average Amount:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(expenseStats.avgAmount)}</Text>
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

export const generateExpenseReportPDF = async (expenses: Expense[], filterType: string, filterValue: string) => {
  const blob = await pdf(<ExpenseReportDocument expenses={expenses} filterType={filterType} filterValue={filterValue} />).toBlob();
  const fileName = `expense-report-${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateExpenseReportPDF;