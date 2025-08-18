import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { SharedPDFHeader, SharedPDFFooter, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

// Register the Lexend font
Font.register({
  family: 'Lexend',
  src: '/fonts/Lexend.ttf',
});

const styles = StyleSheet.create({
  ...sharedStyles,
  section: {
    margin: 10,
    padding: 10,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 20,
    fontFamily: 'Lexend',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Lexend',
  },
  table: {
    display: 'flex',
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableCol: {
    width: '20%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    margin: 'auto',
    marginTop: 5,
    marginBottom: 5,
    fontSize: 8,
    textAlign: 'center',
  },
  summary: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  summaryValue: {
    fontSize: 10,
  },
  netProfit: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10b981',
  },
  detailSection: {
    marginTop: 15,
  },
  detailTable: {
    marginTop: 10,
  },
  wideTableCol: {
    width: '33.33%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  }
});

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
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <SharedPDFHeader firmData={firmData} />
      <View style={{ flex: 1 }}>
          <Text style={styles.title}>Financial Report</Text>
          <Text style={{ fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
            Period: {timeRange === 'global' ? 'All Time' : timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}
          </Text>

          {/* Summary Statistics */}
          <View style={styles.summary}>
            <Text style={styles.subtitle}>Financial Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Revenue:</Text>
              <Text style={styles.summaryValue}>₹{stats.totalRevenue?.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment In (Collected):</Text>
              <Text style={styles.summaryValue}>₹{stats.paymentIn?.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Out (Spent):</Text>
              <Text style={styles.summaryValue}>₹{stats.paymentOut?.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pending Amount:</Text>
              <Text style={styles.summaryValue}>₹{stats.pendingAmount?.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.netProfit}>Net Profit:</Text>
              <Text style={[styles.summaryValue, styles.netProfit]}>₹{stats.netProfit?.toLocaleString()}</Text>
            </View>
          </View>

          {/* Payment In Details */}
          <View style={styles.detailSection}>
            <Text style={styles.subtitle}>Payment In Details</Text>
            <View style={[styles.table, styles.detailTable]}>
              <View style={styles.tableRow}>
                <View style={styles.wideTableCol}>
                  <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Date</Text>
                </View>
                <View style={styles.wideTableCol}>
                  <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Source/Event</Text>
                </View>
                <View style={styles.wideTableCol}>
                  <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Amount</Text>
                </View>
              </View>
              {paymentInDetails.map((payment, index) => (
                <View key={index} style={styles.tableRow}>
                  <View style={styles.wideTableCol}>
                    <Text style={styles.tableCell}>{payment.date}</Text>
                  </View>
                  <View style={styles.wideTableCol}>
                    <Text style={styles.tableCell}>{payment.source}</Text>
                  </View>
                  <View style={styles.wideTableCol}>
                    <Text style={styles.tableCell}>₹{payment.amount?.toLocaleString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      <SharedPDFFooter firmData={firmData} />
    </Page>

    {/* Second Page - Payment Out Details */}
    <Page size="A4" style={styles.page}>
      <SharedPDFHeader firmData={firmData} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Payment Out Details</Text>
          <View style={[styles.table, styles.detailTable]}>
            <View style={styles.tableRow}>
              <View style={styles.wideTableCol}>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Date</Text>
              </View>
              <View style={styles.wideTableCol}>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Type/Description</Text>
              </View>
              <View style={styles.wideTableCol}>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Amount</Text>
              </View>
            </View>
            {paymentOutDetails.map((payment, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.wideTableCol}>
                  <Text style={styles.tableCell}>{payment.date}</Text>
                </View>
                <View style={styles.wideTableCol}>
                  <Text style={styles.tableCell}>{payment.description}</Text>
                </View>
                <View style={styles.wideTableCol}>
                  <Text style={styles.tableCell}>₹{payment.amount?.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Summary on second page */}
          <View style={[styles.summary, { marginTop: 30 }]}>
            <Text style={styles.subtitle}>Payment Breakdown</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Expenses:</Text>
              <Text style={styles.summaryValue}>₹{paymentOutDetails.filter(p => p.type === 'expense').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Staff Payments:</Text>
              <Text style={styles.summaryValue}>₹{paymentOutDetails.filter(p => p.type === 'staff_payment').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Freelancer Payments:</Text>
              <Text style={styles.summaryValue}>₹{paymentOutDetails.filter(p => p.type === 'freelancer_payment').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      <SharedPDFFooter firmData={firmData} />
    </Page>
  </Document>
);

export const generateFinanceReportPDF = async (
  stats: any,
  timeRange: string,
  customStartDate?: string,
  customEndDate?: string
) => {
  try {
    // Fetch firm data
    const firmId = localStorage.getItem('currentFirmId');
    let firmData = null;
    
    if (firmId) {
      const { data: firm } = await supabase
        .from('firms')
        .select('*')
        .eq('id', firmId)
        .single();
      firmData = firm;
    }

    // Fetch detailed payment data for the report
    let startDate: Date;
    let endDate: Date = new Date();
    let isGlobal = false;

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
    } else if (timeRange === 'global') {
      isGlobal = true;
    } else {
      // Calculate date range based on timeRange
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

    // Fetch Payment In details (payments + advance amounts)
    const paymentInDetails: any[] = [];
    
    // Get payments
    let paymentsQuery = supabase
      .from('payments')
      .select('amount, payment_date, event_id')
      .eq('firm_id', firmId);

    if (!isGlobal && startDate) {
      paymentsQuery = paymentsQuery
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0]);
    }

    const { data: payments } = await paymentsQuery;
    
    // Get event titles for payments
    const { data: allEvents } = await supabase
      .from('events')
      .select('id, title')
      .eq('firm_id', firmId);
    
    payments?.forEach(payment => {
      const event = allEvents?.find(e => e.id === payment.event_id);
      paymentInDetails.push({
        date: payment.payment_date,
        source: event?.title || 'General Payment',
        amount: payment.amount,
        type: 'payment'
      });
    });

    // Get events with advance amounts (only if no payments exist for that event)
    let eventsQuery = supabase
      .from('events')
      .select('title, event_date, advance_amount, id')
      .eq('firm_id', firmId)
      .gt('advance_amount', 0);

    if (!isGlobal && startDate) {
      eventsQuery = eventsQuery
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0]);
    }

    const { data: events } = await eventsQuery;
    
    events?.forEach(event => {
      // Only add advance if no payments exist for this event
      const hasPayments = payments?.some(p => p.event_id === event.id);
      if (!hasPayments) {
        paymentInDetails.push({
          date: event.event_date,
          source: `${event.title} (Advance)`,
          amount: event.advance_amount,
          type: 'advance'
        });
      }
    });

    // Fetch Payment Out details (expenses + staff payments + freelancer payments)
    const paymentOutDetails: any[] = [];

    // Get expenses
    let expensesQuery = supabase
      .from('expenses')
      .select('amount, expense_date, description, category')
      .eq('firm_id', firmId);

    if (!isGlobal && startDate) {
      expensesQuery = expensesQuery
        .gte('expense_date', startDate.toISOString().split('T')[0])
        .lte('expense_date', endDate.toISOString().split('T')[0]);
    }

    const { data: expenses } = await expensesQuery;
    
    expenses?.forEach(expense => {
      paymentOutDetails.push({
        date: expense.expense_date,
        description: `${expense.category}: ${expense.description}`,
        amount: expense.amount,
        type: 'expense'
      });
    });

    // Get staff payments
    let staffPaymentsQuery = supabase
      .from('staff_payments')
      .select('amount, payment_date, description, staff_id')
      .eq('firm_id', firmId);

    if (!isGlobal && startDate) {
      staffPaymentsQuery = staffPaymentsQuery
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0]);
    }

    const { data: staffPayments } = await staffPaymentsQuery;
    
    // Get staff names
    const { data: allStaff } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('firm_id', firmId);
    
    staffPayments?.forEach(payment => {
      const staff = allStaff?.find(s => s.id === payment.staff_id);
      paymentOutDetails.push({
        date: payment.payment_date,
        description: `Staff: ${staff?.full_name || 'Unknown'} - ${payment.description || 'Salary Payment'}`,
        amount: payment.amount,
        type: 'staff_payment'
      });
    });

    // Get freelancer payments
    let freelancerPaymentsQuery = supabase
      .from('freelancer_payments')
      .select('amount, payment_date, description, freelancer:freelancers(full_name)')
      .eq('firm_id', firmId);

    if (!isGlobal && startDate) {
      freelancerPaymentsQuery = freelancerPaymentsQuery
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .lte('payment_date', endDate.toISOString().split('T')[0]);
    }

    const { data: freelancerPayments } = await freelancerPaymentsQuery;
    
    freelancerPayments?.forEach(payment => {
      paymentOutDetails.push({
        date: payment.payment_date,
        description: `Freelancer: ${payment.freelancer?.full_name} - ${payment.description || 'Payment'}`,
        amount: payment.amount,
        type: 'freelancer_payment'
      });
    });

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
    const fileName = `finance-report-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`;
    saveAs(blob, fileName);

  } catch (error) {
    console.error('Error generating Finance PDF:', error);
    throw error;
  }
};

export default generateFinanceReportPDF;