import React from 'react';
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { SharedPDFHeader, SharedPDFFooter, sharedStyles, SimpleTable } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/date-utils';

interface ProfitLossData {
  revenue: {
    eventRevenue: number;
    totalRevenue: number;
  };
  expenses: {
    byCategory: { [key: string]: number };
    totalExpenses: number;
  };
  netIncome: number;
  margins: {
    grossMargin: number;
    netMargin: number;
  };
  firmData?: any;
}

const ProfitLossDocument: React.FC<ProfitLossData> = ({ 
  revenue,
  expenses,
  netIncome,
  margins,
  firmData 
}) => {
  const formatCurrency = (amount: number) => `₹${amount?.toLocaleString() || '0'}`;
  const currentDate = formatDate(new Date());

  // Prepare P&L table data
  const profitLossData = [
    ['REVENUE', '', ''],
    ['Event Revenue', formatCurrency(revenue.eventRevenue), ''],
    ['TOTAL REVENUE', '', formatCurrency(revenue.totalRevenue)],
    ['', '', ''],
    ['OPERATING EXPENSES', '', ''],
    // Add expense categories dynamically
    ...Object.entries(expenses.byCategory).map(([category, amount]) => [
      `  ${category}`, formatCurrency(amount), ''
    ]),
    ['TOTAL EXPENSES', '', formatCurrency(expenses.totalExpenses)],
    ['', '', ''],
    ['NET INCOME', '', formatCurrency(netIncome)]
  ];

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />
        
        <Text style={sharedStyles.title}>Profit & Loss Statement</Text>
        
        {/* Report Info */}
        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Date:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Period:</Text>
              <Text style={sharedStyles.detailValue}>Current Year to Date</Text>
            </View>
          </View>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Performance Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Revenue:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(revenue.totalRevenue)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Net Income:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(netIncome)}</Text>
            </View>
          </View>
        </View>

        {/* Profit & Loss Statement Table */}
        <SimpleTable
          headers={['Account', 'Amount', 'Total']}
          rows={profitLossData}
        />

        {/* Financial Ratios & Analysis */}
        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Ratios</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Gross Margin:</Text>
              <Text style={sharedStyles.detailValue}>{margins.grossMargin.toFixed(1)}%</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Net Margin:</Text>
              <Text style={sharedStyles.detailValue}>{margins.netMargin.toFixed(1)}%</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Expense Ratio:</Text>
              <Text style={sharedStyles.detailValue}>
                {revenue.totalRevenue > 0 ? ((expenses.totalExpenses / revenue.totalRevenue) * 100).toFixed(1) : '0'}%
              </Text>
            </View>
          </View>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Business Health</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Profitability:</Text>
              <Text style={sharedStyles.detailValue}>
                {netIncome > 0 ? 'Profitable ✓' : 'Loss ⚠'}
              </Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Efficiency:</Text>
              <Text style={sharedStyles.detailValue}>
                {margins.netMargin > 15 ? 'Excellent ✓' : 
                 margins.netMargin > 5 ? 'Good ✓' : 'Needs Improvement ⚠'}
              </Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Growth Potential:</Text>
              <Text style={sharedStyles.detailValue}>
                {netIncome > 0 ? 'High ✓' : 'Limited ⚠'}
              </Text>
            </View>
          </View>
        </View>

        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const generateProfitLossPDF = async () => {
  try {
    const firmId = localStorage.getItem('selectedFirmId');
    if (!firmId) throw new Error('No firm selected');

    // Fetch firm data
    const { data: firmData } = await supabase
      .from('firms')
      .select('*')
      .eq('id', firmId)
      .single();

    // Get current year start date
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;

    // Calculate Revenue
    // Event revenue from completed events
    const { data: events } = await supabase
      .from('events')
      .select('total_amount, created_at')
      .eq('firm_id', firmId)
      .gte('created_at', yearStart);

    const eventRevenue = events?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
    const totalRevenue = eventRevenue; // Only event revenue for now

    // Calculate Expenses by Category (including salaries)
    const { data: expensesData } = await supabase
      .from('expenses')
      .select('amount, category, expense_date')
      .eq('firm_id', firmId)
      .gte('expense_date', yearStart);

    const { data: staffPayments } = await supabase
      .from('staff_payments')
      .select('amount, payment_date')
      .eq('firm_id', firmId)
      .gte('payment_date', yearStart);

    const { data: freelancerPayments } = await supabase
      .from('freelancer_payments')
      .select('amount, payment_date')
      .eq('firm_id', firmId)
      .gte('payment_date', yearStart);

    const expensesByCategory: { [key: string]: number } = {};
    let totalExpenses = 0;

    expensesData?.forEach(expense => {
      const category = expense.category || 'Other';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + (expense.amount || 0);
      totalExpenses += expense.amount || 0;
    });

    const staffTotal = staffPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const freelancerTotal = freelancerPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    if (staffTotal > 0) {
      expensesByCategory['Staff Salary'] = (expensesByCategory['Staff Salary'] || 0) + staffTotal;
      totalExpenses += staffTotal;
    }
    if (freelancerTotal > 0) {
      expensesByCategory['Freelancer Payments'] = (expensesByCategory['Freelancer Payments'] || 0) + freelancerTotal;
      totalExpenses += freelancerTotal;
    }

    // Calculate Net Income
    const netIncome = totalRevenue - totalExpenses;

    // Calculate Margins
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    const netMargin = grossMargin; // Same as gross for service business

    const profitLossData: ProfitLossData = {
      revenue: {
        eventRevenue,
        totalRevenue
      },
      expenses: {
        byCategory: expensesByCategory,
        totalExpenses
      },
      netIncome,
      margins: {
        grossMargin,
        netMargin
      },
      firmData
    };

    // Generate PDF
    const blob = await pdf(
      <ProfitLossDocument {...profitLossData} />
    ).toBlob();

    const fileName = `Profit Loss Statement ${new Date().toISOString().split('T')[0]}.pdf`;
    saveAs(blob, fileName);

  } catch (error) {
    throw error;
  }
};

export default generateProfitLossPDF;