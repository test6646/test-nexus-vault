import { Document, Page, Text, View, pdf, StyleSheet } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

const customStyles = StyleSheet.create({
  staffInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f6f1',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c4b28d',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: 700,
    color: '#c4b28d',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#666666',
    textAlign: 'center',
  },
  earningsBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
    padding: 12,
    backgroundColor: '#f8f6f1',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#c4b28d',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownAmount: {
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
  },
  breakdownLabel: {
    fontSize: 8,
    color: '#666666',
    marginTop: 2,
  },
});

interface DetailedEventBreakdown {
  eventId: string;
  eventTitle: string;
  eventType: string;
  clientName: string;
  roles: string[];
  totalDays: number;
  ratePerDay: number;
  totalEventPayment: number;
  workDates?: string[];
}

interface PaymentRecord {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  description?: string;
  eventId?: string;
  eventTitle?: string;
}

interface StaffData {
  id: string;
  full_name: string;
  role: string;
  mobile_number?: string;
  total_assignments: number;
  total_tasks: number;
  completed_tasks: number;
  task_earnings: number;
  assignment_earnings: number;
  total_earnings: number;
  paid_amount: number;
  pending_amount: number;
  detailedEventBreakdown?: DetailedEventBreakdown[];
  paymentHistory?: PaymentRecord[];
}

interface StaffDetailedReportProps {
  staff: StaffData;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const StaffDetailedReportDocument: React.FC<StaffDetailedReportProps> = ({ staff, firmData }) => {
  const currentDate = formatDate(new Date());
  
  const getCompletionRate = () => {
    return staff.total_tasks > 0 ? Math.round((staff.completed_tasks / staff.total_tasks) * 100) : 0;
  };

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>DETAILED STAFF REPORT</Text>

        {/* Staff Information */}
        <View style={customStyles.staffInfo}>
          <View style={sharedStyles.column}>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Name:</Text>
              <Text style={sharedStyles.detailValue}>{staff.full_name}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Role:</Text>
              <Text style={sharedStyles.detailValue}>{staff.role}</Text>
            </View>
          </View>
          <View style={sharedStyles.column}>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Mobile:</Text>
              <Text style={sharedStyles.detailValue}>{staff.mobile_number || 'N/A'}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Type:</Text>
              <Text style={sharedStyles.detailValue}>Internal Staff</Text>
            </View>
          </View>
          <View style={sharedStyles.column}>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Events:</Text>
              <Text style={sharedStyles.detailValue}>{staff.total_assignments}</Text>
            </View>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={customStyles.summaryGrid}>
          <View style={customStyles.summaryItem}>
            <Text style={customStyles.summaryAmount}>₹{staff.total_earnings.toLocaleString()}</Text>
            <Text style={customStyles.summaryLabel}>Total Earnings</Text>
          </View>
          <View style={customStyles.summaryItem}>
            <Text style={customStyles.summaryAmount}>₹{staff.paid_amount.toLocaleString()}</Text>
            <Text style={customStyles.summaryLabel}>Amount Paid</Text>
          </View>
          <View style={customStyles.summaryItem}>
            <Text style={customStyles.summaryAmount}>₹{staff.pending_amount.toLocaleString()}</Text>
            <Text style={customStyles.summaryLabel}>Amount Pending</Text>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={customStyles.earningsBreakdown}>
          <View style={customStyles.breakdownItem}>
            <Text style={customStyles.breakdownAmount}>₹{staff.assignment_earnings.toLocaleString()}</Text>
            <Text style={customStyles.breakdownLabel}>Event Assignments</Text>
          </View>
          <View style={customStyles.breakdownItem}>
            <Text style={customStyles.breakdownAmount}>₹{staff.task_earnings.toLocaleString()}</Text>
            <Text style={customStyles.breakdownLabel}>Task Payments</Text>
          </View>
          <View style={customStyles.breakdownItem}>
            <Text style={customStyles.breakdownAmount}>{staff.total_tasks}</Text>
            <Text style={customStyles.breakdownLabel}>Total Tasks</Text>
          </View>
          <View style={customStyles.breakdownItem}>
            <Text style={customStyles.breakdownAmount}>{getCompletionRate()}%</Text>
            <Text style={customStyles.breakdownLabel}>Completion Rate</Text>
          </View>
        </View>

        {/* Event Work History */}
        {staff.detailedEventBreakdown && staff.detailedEventBreakdown.length > 0 && (
          <>
            <Text style={sharedStyles.sectionTitle}>Event Work History</Text>
            <SimpleTable
              headers={['Event', 'Client', 'Roles', 'Days', 'Rate/Day', 'Total']}
              rows={staff.detailedEventBreakdown.map(event => [
                { title: event.eventTitle, subtitle: event.eventType },
                event.clientName,
                { text: event.roles.join(', '), lines: event.roles.map(role => role.trim()) },
                event.totalDays.toString(),
                `₹${event.ratePerDay.toLocaleString()}`,
                `₹${event.totalEventPayment.toLocaleString()}`
              ])}
              multiLineColumns={[0, 2]}
            />
          </>
        )}

        <SharedPDFFooter firmData={firmData} />
      </Page>

      {/* Payment History on Second Page */}
      {staff.paymentHistory && staff.paymentHistory.length > 0 && (
        <Page size="A4" style={sharedStyles.page}>
          <SharedPDFHeader firmData={firmData} />

          <Text style={sharedStyles.title}>PAYMENT HISTORY - {staff.full_name.toUpperCase()}</Text>

          <Text style={sharedStyles.sectionTitle}>Payment History</Text>
          <SimpleTable
            headers={['Date', 'Amount', 'Method', 'Related Event', 'Description']}
            rows={staff.paymentHistory
              .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
              .map(payment => [
                new Date(payment.paymentDate).toLocaleDateString('en-IN'),
                `₹${payment.amount.toLocaleString()}`,
                payment.paymentMethod,
                payment.eventTitle || 'General Payment',
                payment.description || '-'
              ])
            }
          />

          {/* Payment Summary */}
          <View style={customStyles.earningsBreakdown}>
            <View style={customStyles.breakdownItem}>
              <Text style={customStyles.breakdownAmount}>{staff.paymentHistory.length}</Text>
              <Text style={customStyles.breakdownLabel}>Total Payments</Text>
            </View>
            <View style={customStyles.breakdownItem}>
              <Text style={customStyles.breakdownAmount}>₹{staff.paid_amount.toLocaleString()}</Text>
              <Text style={customStyles.breakdownLabel}>Total Paid</Text>
            </View>
            <View style={customStyles.breakdownItem}>
              <Text style={customStyles.breakdownAmount}>₹{staff.pending_amount.toLocaleString()}</Text>
              <Text style={customStyles.breakdownLabel}>Still Pending</Text>
            </View>
            <View style={customStyles.breakdownItem}>
              <Text style={customStyles.breakdownAmount}>
                {staff.total_earnings > 0 ? Math.round((staff.paid_amount / staff.total_earnings) * 100) : 0}%
              </Text>
              <Text style={customStyles.breakdownLabel}>Payment Rate</Text>
            </View>
          </View>

          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}
    </Document>
  );
};

export const generateStaffDetailedReportPDF = async (staff: StaffData) => {
  // Update the user-specific firm storage patterns in these files
  let firmData = null;
  try {
    // Try to get current user and their firm
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Try multiple ways to get firm ID
      const userFirmKey = `selectedFirmId_${user.id}`;
      let firmId = localStorage.getItem(userFirmKey) || localStorage.getItem('selectedFirmId');
      
      // If no localStorage, try getting from profile
      if (!firmId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_firm_id, firm_id')
          .eq('user_id', user.id)
          .single();
        
        firmId = profile?.current_firm_id || profile?.firm_id;
      }
      
      if (firmId) {
        console.log('Fetching firm data for Staff PDF with ID:', firmId);
        const { data: firm, error } = await supabase
          .from('firms')
          .select('name, description, logo_url, header_left_content, footer_content')
          .eq('id', firmId)
          .single();
        
        if (error) {
          console.error('Supabase error fetching firm data:', error);
        } else {
          console.log('Successfully fetched firm data:', firm);
          firmData = firm;
        }
      } else {
        console.warn('No firm ID found for Staff PDF generation');
      }
    }
  } catch (error) {
    console.error('Error fetching firm data for Staff PDF:', error);
  }
  
  console.log('Final firmData for Staff PDF:', firmData);

  const blob = await pdf(
    <StaffDetailedReportDocument staff={staff} firmData={firmData} />
  ).toBlob();
  
  const fileName = `${staff.full_name} Detailed Report ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateStaffDetailedReportPDF;