import React from 'react';
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { SharedPDFHeader, SharedPDFFooter, sharedStyles, SimpleTable } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/date-utils';
import { parsePaymentMethod } from '@/lib/payment-method-validator';

interface FinanceReportProps {
  stats: any;
  timeRange: string;
  firmData?: any;
  paymentInDetails?: any[];
  paymentOutDetails?: any[];
}

const FinanceReportDocument: React.FC<FinanceReportProps> = ({ 
  stats, 
  timeRange, 
  firmData,
  paymentInDetails = [],
  paymentOutDetails = []
}) => {
  const formatCurrency = (amount: number) => `₹${amount?.toLocaleString() || '0'}`;
  const currentDate = formatDate(new Date());

  const getTimeRangeText = () => {
    switch (timeRange) {
      case 'global': return 'All Time';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'quarter': return 'This Quarter';
      case 'year': return 'This Year';
      case 'custom': return 'Custom Range';
      default: return timeRange.charAt(0).toUpperCase() + timeRange.slice(1);
    }
  };

  // Prepare payment in table data - FIXED LABELS
  const paymentInTableData = paymentInDetails.map(payment => [
    formatDate(new Date(payment.date)),
    payment.source || 'N/A',
    formatCurrency(payment.amount || 0),
    payment.type === 'advance' ? 'Advance' : 
    payment.type === 'accounting_credit' ? 'Accounting' : 'Payment'
  ]);

  // Prepare payment out table data - FIXED LABELS 
  const paymentOutTableData = paymentOutDetails.map(payment => [
    formatDate(new Date(payment.date)),
    payment.description || 'N/A',
    formatCurrency(payment.amount || 0),
    payment.type === 'expense' ? 'Expense' : 
    payment.type === 'accounting_debit' ? 'Accounting' :
    payment.type === 'staff_payment' ? 'Staff' : 'Freelancer'
  ]);

  // Compute totals and payment method breakdown (includes accounting entries)
  const paymentInTotal = paymentInDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paymentOutTotal = paymentOutDetails.reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashIn = paymentInDetails.reduce((sum, p) => sum + (parsePaymentMethod(p.payment_method) === 'Cash' ? (p.amount || 0) : 0), 0);
  const digitalIn = paymentInDetails.reduce((sum, p) => sum + (parsePaymentMethod(p.payment_method) === 'Cash' ? 0 : (p.amount || 0)), 0);
  const cashOut = paymentOutDetails.reduce((sum, p) => sum + (parsePaymentMethod(p.payment_method) === 'Cash' ? (p.amount || 0) : 0), 0);
  const digitalOut = paymentOutDetails.reduce((sum, p) => sum + (parsePaymentMethod(p.payment_method) === 'Cash' ? 0 : (p.amount || 0)), 0);

  // Split data into chunks of 15 for better pagination
  const ROWS_PER_PAGE = 15;
  const paymentInChunks = [];
  for (let i = 0; i < paymentInTableData.length; i += ROWS_PER_PAGE) {
    paymentInChunks.push(paymentInTableData.slice(i, i + ROWS_PER_PAGE));
  }
  
  const paymentOutChunks = [];
  for (let i = 0; i < paymentOutTableData.length; i += ROWS_PER_PAGE) {
    paymentOutChunks.push(paymentOutTableData.slice(i, i + ROWS_PER_PAGE));
  }

  const hasData = paymentInDetails.length > 0 || paymentOutDetails.length > 0;

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Financial Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Period:</Text>
              <Text style={sharedStyles.detailValue}>{getTimeRangeText()}</Text>
            </View>
          </View>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Financial Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Revenue:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(paymentInTotal)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Net Profit:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(paymentInTotal - paymentOutTotal)}</Text>
            </View>
          </View>
        </View>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Payment Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Payments In:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(paymentInTotal)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Payments Out:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(paymentOutTotal)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Pending Amount:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(stats?.pendingAmount || 0)}</Text>
            </View>
          </View>
        </View>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Payment Method Breakdown</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Cash In:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(cashIn)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Digital In:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(digitalIn)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Cash Out:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(cashOut)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Digital Out:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(digitalOut)}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Payment In Tables - 15 rows per page */}
      {paymentInChunks.map((chunk, chunkIndex) => (
        <Page key={`payment-in-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Payments In Details {paymentInChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${paymentInChunks.length})` : ''}
          </Text>

          <SimpleTable
            headers={['Date', 'Source/Event', 'Amount', 'Type']}
            rows={chunk}
          />
        </Page>
      ))}

      {/* Payment Out Tables - 15 rows per page */}
      {paymentOutChunks.map((chunk, chunkIndex) => (
        <Page key={`payment-out-${chunkIndex}`} size="A4" style={sharedStyles.page}>
          <Text style={sharedStyles.title}>
            Payments Out Details {paymentOutChunks.length > 1 ? `(Page ${chunkIndex + 1} of ${paymentOutChunks.length})` : ''}
          </Text>

          <SimpleTable
            headers={['Date', 'Description', 'Amount', 'Type']}
            rows={chunk}
          />
        </Page>
      ))}

      {/* Final Page: Footer Only */}
      {hasData && (
        <Page size="A4" style={sharedStyles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}

      {/* If no data, add footer to first page */}
      {!hasData && (
        <Page size="A4" style={sharedStyles.page}>
          <View style={{ flex: 1 }} />
          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}
    </Document>
  );
};

export const generateFinanceReportPDF = async (
  stats: any,
  timeRange: string,
  firmData?: any,
  firmId?: string,
  customStartDate?: string,
  customEndDate?: string
) => {
  try {
    // Use provided firmId or fallback to localStorage
    const currentFirmId = firmId || localStorage.getItem('selectedFirmId');
    
    if (!currentFirmId) {
      throw new Error('No firm ID available for PDF generation');
    }
    
    // Fetch firm data if not provided
    if (!firmData) {
      const { data: firm, error: firmError } = await supabase
        .from('firms')
        .select('*')
        .eq('id', currentFirmId)
        .single();
      
      if (firmError) {
        console.error('Error fetching firm data:', firmError);
      } else {
        firmData = firm;
      }
    }

    // Use the same date range logic as the Finance page
    let startDate: Date;
    let endDate: Date = new Date();
    let isGlobal = false;

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeRange === 'global') {
      isGlobal = true;
    } else {
      // Use the same date calculation logic as the Finance stats hook
      try {
        const { getDateRangeForFinance } = await import('@/lib/date-utils');
        const { startDate: calculatedStart, endDate: calculatedEnd, isGlobal: calculatedGlobal } = getDateRangeForFinance(timeRange);
        startDate = calculatedStart;
        endDate = calculatedEnd;
        isGlobal = calculatedGlobal;
      } catch (error) {
        console.error('Error importing date utils, falling back to basic calculation:', error);
        // Fallback to basic calculation
        const now = new Date();
        switch (timeRange) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            isGlobal = true;
        }
      }
    }

    console.log('Finance PDF Debug:', {
      timeRange,
      isGlobal,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      firmId: currentFirmId
    });

    // Fetch Payment In details (payments + advance amounts)
    const paymentInDetails: any[] = [];
    
    // Get payments
    let paymentsQuery = supabase
      .from('payments')
      .select('amount, payment_date, event_id, payment_method')
      .eq('firm_id', currentFirmId);

    if (!isGlobal && startDate) {
      paymentsQuery = paymentsQuery
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0]);
    }

    const { data: payments, error: paymentsError } = await paymentsQuery;
    
    console.log('Payments query result:', {
      paymentsCount: payments?.length || 0,
      paymentsError,
      samplePayment: payments?.[0]
    });
    
    // Get event titles for payments
    const { data: allEvents } = await supabase
      .from('events')
      .select('id, title')
      .eq('firm_id', currentFirmId);
    
    payments?.forEach(payment => {
      const event = allEvents?.find(e => e.id === payment.event_id);
      paymentInDetails.push({
        date: payment.payment_date,
        source: event?.title || 'General Payment',
        amount: payment.amount,
        payment_method: payment.payment_method,
        type: 'payment'
      });
    });

    // Get events with advance amounts (only if no payments exist for that event)
    let eventsQuery = supabase
      .from('events')
      .select('title, event_date, advance_amount, advance_payment_method, id')
      .eq('firm_id', currentFirmId)
      .gt('advance_amount', 0);

    if (!isGlobal && startDate) {
      eventsQuery = eventsQuery
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0]);
    }

    const { data: events, error: eventsError } = await eventsQuery;
    
    console.log('Events query result:', {
      eventsCount: events?.length || 0,
      eventsError,
      sampleEvent: events?.[0]
    });
    
    events?.forEach(event => {
      // ALWAYS add advance amounts to financial report
      if (event.advance_amount && event.advance_amount > 0) {
        paymentInDetails.push({
          date: event.event_date,
          source: `${event.title} (Advance)`,
          amount: event.advance_amount,
          payment_method: event.advance_payment_method,
          type: 'advance'
        });
      }
    });

    // Fetch Payment Out details (EXPENSES ONLY - no double counting of salary)
    const paymentOutDetails: any[] = [];

    // Get expenses ONLY (salary payments should be recorded as expenses to avoid duplication)
    let expensesQuery = supabase
      .from('expenses')
      .select('amount, expense_date, description, category, payment_method')
      .eq('firm_id', currentFirmId);

    if (!isGlobal && startDate) {
      expensesQuery = expensesQuery
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]);
    }

    const { data: expenses, error: expensesError } = await expensesQuery;
    
    console.log('Expenses query result:', {
      expensesCount: expenses?.length || 0,
      expensesError,
      sampleExpense: expenses?.[0]
    });
    
    expenses?.forEach(expense => {
      paymentOutDetails.push({
        date: expense.expense_date,
        description: `${expense.category}: ${expense.description}`,
        amount: expense.amount,
        payment_method: expense.payment_method,
        type: 'expense'
      });
    });

    // Include accounting entries marked reflect_to_company = true - INCLUDE payment_method
    let accQuery = supabase
      .from('accounting_entries')
      .select('amount, entry_date, title, category, entry_type, reflect_to_company, payment_method')
      .eq('firm_id', currentFirmId)
      .eq('reflect_to_company', true);

    if (!isGlobal && startDate) {
      accQuery = accQuery
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .lte('entry_date', endDate.toISOString().split('T')[0]);
    }

    const { data: accEntries, error: accError } = await accQuery;
    
    if (accError) {
      console.warn('Error fetching accounting entries for PDF:', accError);
      // Continue without accounting entries if there's an error
    } else {
      accEntries?.forEach((entry: any) => {
        if (entry.entry_type === 'Credit') {
          paymentInDetails.push({
            date: entry.entry_date,
            source: `${entry.category} - ${entry.title}`,
            amount: entry.amount,
            payment_method: entry.payment_method || 'Cash', // 🔥 FIXED: Use actual payment_method
            type: 'accounting_credit'
          });
        } else if (entry.entry_type === 'Debit') {
          paymentOutDetails.push({
            date: entry.entry_date,
            description: `${entry.category} - ${entry.title}`,
            amount: entry.amount,
            payment_method: entry.payment_method || 'Cash', // 🔥 FIXED: Use actual payment_method
            type: 'accounting_debit'
          });
        }
      });
    }

    // Sort details by date
    paymentInDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    paymentOutDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Generate PDF
    const blob = await pdf(
      <FinanceReportDocument 
        stats={stats} 
        timeRange={timeRange}
        firmData={firmData}
        paymentInDetails={paymentInDetails}
        paymentOutDetails={paymentOutDetails}
      />
    ).toBlob();

    // Save the PDF
    const fileName = `Finance Report ${timeRange ? timeRange.charAt(0).toUpperCase() + timeRange.slice(1) : ''} ${new Date().toISOString().split('T')[0]}.pdf`;
    saveAs(blob, fileName);

  } catch (error) {
    throw error;
  }
};

export default generateFinanceReportPDF;