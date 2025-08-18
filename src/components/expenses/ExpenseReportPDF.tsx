import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Expense } from '@/types/studio';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

interface ExpenseReportProps {
  expenses: Expense[];
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

const ExpenseReportDocument: React.FC<ExpenseReportProps> = ({ expenses, filterType, filterValue, firmData }) => {
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

  const tableData = expenses.slice(0, 25).map(expense => [
    expense.description,
    expense.category,
    formatDate(new Date(expense.expense_date)),
    formatCurrency(expense.amount)
  ]);

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Expense Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Expenses:</Text>
              <Text style={sharedStyles.detailValue}>{expenseStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
        </View>

        <SimpleTable
          headers={['Description', 'Category', 'Date', 'Amount']}
          rows={tableData}
        />

        <SharedPDFFooter firmData={firmData} />
      </Page>

      {/* Summary on Separate Page */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>EXPENSE SUMMARY</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Expenses:</Text>
              <Text style={sharedStyles.detailValue}>{expenseStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(expenseStats.totalAmount)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Average Amount:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(expenseStats.avgAmount)}</Text>
            </View>
          </View>
        </View>

        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const generateExpenseReportPDF = async (expenses: Expense[], filterType: string, filterValue: string) => {
  // Get firm data using localStorage firm ID
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

  const blob = await pdf(<ExpenseReportDocument expenses={expenses} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `expense-report-${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateExpenseReportPDF;