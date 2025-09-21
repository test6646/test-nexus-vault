import React from 'react';
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { SharedPDFHeader, SharedPDFFooter, sharedStyles, SimpleTable } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/date-utils';
import { calculateEventBalance, calculateTotalPaid, calculateTotalClosed } from '@/lib/payment-calculator';

interface AdvancedBalanceSheetData {
  assets: {
    cashAndBank: number;
    accountsReceivable: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    totalEquity: number;
  };
  breakdown: {
    totalRevenue: number;
    totalCollected: number;
    totalExpenses: number;
    totalPending: number;
    totalClosed: number;
    eventsCount: number;
    avgEventValue: number;
  };
  firmData?: any;
}

const AdvancedBalanceSheetDocument: React.FC<AdvancedBalanceSheetData> = ({ 
  assets, 
  liabilities, 
  equity, 
  breakdown,
  firmData 
}) => {
  const formatCurrency = (amount: number) => `₹${amount?.toLocaleString() || '0'}`;
  const currentDate = formatDate(new Date());

  // Prepare balance sheet table data with proper accounting format
  const balanceSheetData = [
    ['ASSETS', '', ''],
    ['Current Assets:', '', ''],
    ['  Cash & Bank Balance', formatCurrency(assets.cashAndBank), ''],
    ['  Accounts Receivable', formatCurrency(assets.accountsReceivable), ''],
    ['TOTAL ASSETS', '', formatCurrency(assets.totalAssets)],
    ['', '', ''],
    ['LIABILITIES & EQUITY', '', ''],
    ['Current Liabilities:', '', ''],
    ['  Accounts Payable', formatCurrency(liabilities.accountsPayable), ''],
    ['TOTAL LIABILITIES', '', formatCurrency(liabilities.totalLiabilities)],
    ['', '', ''],
    ['EQUITY', '', ''],
    ['  Retained Earnings', formatCurrency(equity.retainedEarnings), ''],
    ['TOTAL EQUITY', '', formatCurrency(equity.totalEquity)],
    ['', '', ''],
    ['TOTAL LIABILITIES + EQUITY', '', formatCurrency(liabilities.totalLiabilities + equity.totalEquity)]
  ];

  const businessBreakdownData = [
    ['Total Revenue (All Events)', formatCurrency(breakdown.totalRevenue)],
    ['Total Collected (Cash In)', formatCurrency(breakdown.totalCollected)],
    ['Total Expenses (Cash Out)', formatCurrency(breakdown.totalExpenses)],
    ['Pending Collections', formatCurrency(breakdown.totalPending)],
    ['Closed/Written Off', formatCurrency(breakdown.totalClosed)],
    ['Active Events', breakdown.eventsCount.toString()],
    ['Average Event Value', formatCurrency(breakdown.avgEventValue)]
  ];

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />
        
        <Text style={sharedStyles.title}>Balance Sheet</Text>
        
        {/* Report Info */}
        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Date:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Type:</Text>
              <Text style={sharedStyles.detailValue}>Comprehensive Balance Sheet</Text>
            </View>
          </View>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Position</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Assets:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(assets.totalAssets)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Net Worth:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(equity.totalEquity)}</Text>
            </View>
          </View>
        </View>

        {/* Balance Sheet Table */}
        <SimpleTable
          headers={['Account', 'Amount', 'Total']}
          rows={balanceSheetData}
        />

        {/* Balance Verification */}
        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Balance Verification</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Assets:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(assets.totalAssets)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Liabilities + Equity:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(liabilities.totalLiabilities + equity.totalEquity)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Balance Status:</Text>
              <Text style={sharedStyles.detailValue}>
                {Math.abs(assets.totalAssets - (liabilities.totalLiabilities + equity.totalEquity)) < 1 ? 'BALANCED ✓' : 'UNBALANCED ⚠'}
              </Text>
            </View>
          </View>
        </View>

      </Page>

      {/* Page 2: Business Breakdown */}
      <Page size="A4" style={sharedStyles.page}>
        <Text style={sharedStyles.title}>Business Financial Breakdown</Text>

        {/* Business Metrics */}
        <SimpleTable
          headers={['Metric', 'Amount']}
          rows={businessBreakdownData}
        />

        {/* Notes Section */}
        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Notes & Methodology</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Cash & Bank:</Text>
              <Text style={sharedStyles.detailValue}>Total payments collected + advances - expenses</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Receivables:</Text>
              <Text style={sharedStyles.detailValue}>Pending balances from active events</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Retained Earnings:</Text>
              <Text style={sharedStyles.detailValue}>Net assets representing business equity</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Data Source:</Text>
              <Text style={sharedStyles.detailValue}>Real-time from Events, Payments & Expenses</Text>
            </View>
          </View>
        </View>

        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const generateBalanceSheetPDF = async () => {
  try {
    const firmId = localStorage.getItem('selectedFirmId');
    if (!firmId) throw new Error('No firm selected');

    // Fetch firm data
    const { data: firmData } = await supabase
      .from('firms')
      .select('*')
      .eq('id', firmId)
      .single();

    // Get all events with related data
    const { data: events } = await supabase
      .from('events')
      .select(`
        *,
        payments(amount, payment_date),
        event_closing_balances(closing_amount)
      `)
      .eq('firm_id', firmId);

    // Get all expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('firm_id', firmId);

    // Get all accounting entries for more comprehensive data
    const { data: accountingEntries } = await supabase
      .from('accounting_entries')
      .select('*')
      .eq('firm_id', firmId);

    // Calculate comprehensive financial data
    let totalRevenue = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let totalClosed = 0;
    let eventsCount = events?.length || 0;

    events?.forEach(event => {
      const eventTotal = event.total_amount || 0;
      const eventPaid = calculateTotalPaid(event as any);
      const eventClosed = calculateTotalClosed(event as any);
      const eventPending = calculateEventBalance(event as any);

      totalRevenue += eventTotal;
      totalCollected += eventPaid;
      totalClosed += eventClosed;
      totalPending += eventPending;
    });

    const totalExpenses = expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    const avgEventValue = eventsCount > 0 ? totalRevenue / eventsCount : 0;
    
    // Include accounting entries for comprehensive calculation
    const accountingCredits = accountingEntries?.filter(e => e.entry_type === 'Credit').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const accountingDebits = accountingEntries?.filter(e => e.entry_type === 'Debit').reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

    // ASSETS - Enhanced calculation
    // Cash & Bank = Total collected - Total expenses + Net accounting credits/debits
    const netAccountingBalance = accountingCredits - accountingDebits;
    const cashAndBank = Math.max(0, totalCollected - totalExpenses + netAccountingBalance);
    
    // Accounts Receivable = Pending payments (excluding closed amounts)
    const accountsReceivable = totalPending;
    
    // Other Assets from accounting entries (Assets category)
    const otherAssets = accountingEntries?.filter(e => e.category === 'Assets').reduce((sum, e) => {
      return sum + (e.entry_type === 'Debit' ? e.amount : -e.amount);
    }, 0) || 0;
    
    const totalAssets = cashAndBank + accountsReceivable + Math.max(0, otherAssets);

    // LIABILITIES - Enhanced calculation
    // Accounts Payable from accounting entries (Liabilities category)
    const accountsPayable = accountingEntries?.filter(e => e.category === 'Liabilities').reduce((sum, e) => {
      return sum + (e.entry_type === 'Credit' ? e.amount : -e.amount);
    }, 0) || 0;
    
    // Outstanding salary/freelancer payments as liabilities
    const outstandingSalaries = 0; // This could be calculated from unpaid salaries if tracked
    
    const totalLiabilities = Math.max(0, accountsPayable + outstandingSalaries);

    // EQUITY - Enhanced calculation
    // Capital from accounting entries
    const capital = accountingEntries?.filter(e => e.category === 'Capital').reduce((sum, e) => {
      return sum + (e.entry_type === 'Credit' ? e.amount : -e.amount);
    }, 0) || 0;
    
    // Retained Earnings = Total Assets - Total Liabilities - Capital
    const retainedEarnings = totalAssets - totalLiabilities - Math.max(0, capital);
    const totalEquity = Math.max(0, capital) + retainedEarnings;

    const balanceSheetData: AdvancedBalanceSheetData = {
      assets: {
        cashAndBank,
        accountsReceivable,
        totalAssets
      },
      liabilities: {
        accountsPayable,
        totalLiabilities
      },
      equity: {
        retainedEarnings,
        totalEquity
      },
      breakdown: {
        totalRevenue,
        totalCollected,
        totalExpenses,
        totalPending,
        totalClosed,
        eventsCount,
        avgEventValue
      },
      firmData
    };

    // Generate PDF
    const blob = await pdf(
      <AdvancedBalanceSheetDocument {...balanceSheetData} />
    ).toBlob();

    const fileName = `Advanced Balance Sheet ${new Date().toISOString().split('T')[0]}.pdf`;
    saveAs(blob, fileName);

  } catch (error) {
    throw error;
  }
};

export default generateBalanceSheetPDF;