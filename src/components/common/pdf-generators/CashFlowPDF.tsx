import React from 'react';
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { SharedPDFHeader, SharedPDFFooter, sharedStyles, SimpleTable } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/date-utils';

interface CashFlowData {
  operatingActivities: {
    paymentsFromClients: number;
    paymentsForExpenses: number;
    netOperatingCashFlow: number;
  };
  netCashFlow: number;
  cashBeginning: number;
  cashEnding: number;
  firmData?: any;
}

const CashFlowDocument: React.FC<CashFlowData> = ({ 
  operatingActivities,
  netCashFlow,
  cashBeginning,
  cashEnding,
  firmData 
}) => {
  const formatCurrency = (amount: number) => `₹${amount?.toLocaleString() || '0'}`;
  const currentDate = formatDate(new Date());

  // Prepare cash flow table data
  const cashFlowData = [
    ['CASH FLOWS FROM OPERATING ACTIVITIES', '', ''],
    ['Cash Receipts:', '', ''],
    ['  Payments received from clients', formatCurrency(operatingActivities.paymentsFromClients), ''],
    ['Cash Payments:', '', ''],
    ['  Payments for operating expenses', `(${formatCurrency(operatingActivities.paymentsForExpenses)})`, ''],
    ['NET CASH FROM OPERATING ACTIVITIES', '', formatCurrency(operatingActivities.netOperatingCashFlow)],
    ['', '', ''],
    ['CASH FLOWS FROM INVESTING ACTIVITIES', '', ''],
    ['  No investing activities recorded', '₹0', ''],
    ['NET CASH FROM INVESTING ACTIVITIES', '', '₹0'],
    ['', '', ''],
    ['CASH FLOWS FROM FINANCING ACTIVITIES', '', ''],
    ['  No financing activities recorded', '₹0', ''],
    ['NET CASH FROM FINANCING ACTIVITIES', '', '₹0'],
    ['', '', ''],
    ['NET INCREASE (DECREASE) IN CASH', '', formatCurrency(netCashFlow)],
    ['Cash at beginning of period', '', formatCurrency(cashBeginning)],
    ['CASH AT END OF PERIOD', '', formatCurrency(cashEnding)]
  ];

  return (
    <Document>
      {/* Page 1: Header + Summary Only */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />
        
        <Text style={sharedStyles.title}>Statement of Cash Flows</Text>
        
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
            <Text style={sharedStyles.sectionTitle}>Cash Flow Summary</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Operating Cash Flow:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(operatingActivities.netOperatingCashFlow)}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Ending Cash Balance:</Text>
              <Text style={sharedStyles.detailValue}>{formatCurrency(cashEnding)}</Text>
            </View>
          </View>
        </View>

        {/* Cash Flow Analysis */}
        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Cash Flow Analysis</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Cash Conversion:</Text>
              <Text style={sharedStyles.detailValue}>
                {operatingActivities.paymentsFromClients > 0 
                  ? `${((operatingActivities.netOperatingCashFlow / operatingActivities.paymentsFromClients) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Operating Efficiency:</Text>
              <Text style={sharedStyles.detailValue}>
                {operatingActivities.netOperatingCashFlow > 0 ? 'Positive ✓' : 'Needs Attention ⚠'}
              </Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Cash Position:</Text>
              <Text style={sharedStyles.detailValue}>
                {cashEnding > 0 ? 'Healthy ✓' : 'Critical ⚠'}
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Page 2: Cash Flow Statement Table */}
      <Page size="A4" style={sharedStyles.page}>
        <Text style={sharedStyles.title}>Cash Flow Statement Details</Text>
        
        <SimpleTable
          headers={['Cash Flow Activity', 'Amount', 'Total']}
          rows={cashFlowData}
        />
      </Page>

      {/* Final Page: Footer Only */}
      <Page size="A4" style={sharedStyles.page}>
        <View style={{ flex: 1 }} />
        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const generateCashFlowPDF = async () => {
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

    // Cash from Operating Activities
    // Payments received from clients
    const { data: paymentsReceived } = await supabase
      .from('payments')
      .select('amount')
      .eq('firm_id', firmId)
      .gte('payment_date', yearStart);

    const { data: advancePayments } = await supabase
      .from('events')
      .select('advance_amount, created_at')
      .eq('firm_id', firmId)
      .gt('advance_amount', 0)
      .gte('created_at', yearStart);

    const paymentsFromClients = (paymentsReceived?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0) +
                               (advancePayments?.reduce((sum, e) => sum + (e.advance_amount || 0), 0) || 0);

    // Payments for expenses (including salaries)
    const { data: expensesPaid } = await supabase
      .from('expenses')
      .select('amount')
      .eq('firm_id', firmId)
      .gte('expense_date', yearStart);

    const { data: staffPayments } = await supabase
      .from('staff_payments')
      .select('amount')
      .eq('firm_id', firmId)
      .gte('payment_date', yearStart);

    const { data: freelancerPayments } = await supabase
      .from('freelancer_payments')
      .select('amount')
      .eq('firm_id', firmId)
      .gte('payment_date', yearStart);

    const paymentsForExpenses =
      (expensesPaid?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0) +
      (staffPayments?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0) +
      (freelancerPayments?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0);

    // Net operating cash flow
    const netOperatingCashFlow = paymentsFromClients - paymentsForExpenses;

    // Calculate cash balances
    // Beginning cash (we'll estimate based on previous year or assume 0 for simplicity)
    const cashBeginning = 0; // Could be enhanced to calculate from previous periods

    // Ending cash = Beginning + Net cash flow
    const netCashFlow = netOperatingCashFlow; // Only operating activities for now
    const cashEnding = cashBeginning + netCashFlow;

    const cashFlowData: CashFlowData = {
      operatingActivities: {
        paymentsFromClients,
        paymentsForExpenses,
        netOperatingCashFlow
      },
      netCashFlow,
      cashBeginning,
      cashEnding,
      firmData
    };

    // Generate PDF
    const blob = await pdf(
      <CashFlowDocument {...cashFlowData} />
    ).toBlob();

    const fileName = `Cash Flow Statement ${new Date().toISOString().split('T')[0]}.pdf`;
    saveAs(blob, fileName);

  } catch (error) {
    throw error;
  }
};

export default generateCashFlowPDF;