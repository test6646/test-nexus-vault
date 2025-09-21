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
  sectionBreak: {
    marginVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});

interface StaffDashboardData {
  profile: {
    full_name: string;
    role: string;
    mobile_number?: string;
  };
  stats: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    reportedTasks: number;
    totalAssignments: number;
    completedEvents: number;
    upcomingEvents: number;
    totalEarnings: number;
    taskEarnings: number;
    assignmentEarnings: number;
    paidAmount: number;
    pendingAmount: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    due_date?: string;
    amount?: number;
    event?: { title: string };
  }>;
  assignments: Array<{
    id: string;
    event_title: string;
    event_type: string;
    event_date: string;
    role: string;
    day_number: number;
    client_name?: string;
  }>;
}

interface StaffDashboardPDFProps {
  data: StaffDashboardData;
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const StaffDashboardDocument: React.FC<StaffDashboardPDFProps> = ({ data, firmData }) => {
  const currentDate = formatDate(new Date());
  
  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>STAFF DASHBOARD REPORT</Text>

        {/* Staff Information */}
        <View style={customStyles.staffInfo}>
          <View style={sharedStyles.column}>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Name:</Text>
              <Text style={sharedStyles.detailValue}>{data.profile.full_name}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Role:</Text>
              <Text style={sharedStyles.detailValue}>{data.profile.role}</Text>
            </View>
          </View>
          <View style={sharedStyles.column}>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Mobile:</Text>
              <Text style={sharedStyles.detailValue}>{data.profile.mobile_number || 'N/A'}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
          </View>
        </View>

        {/* Summary Statistics */}
        <View style={customStyles.summaryGrid}>
          <View style={customStyles.summaryItem}>
            <Text style={customStyles.summaryAmount}>{data.stats.totalTasks}</Text>
            <Text style={customStyles.summaryLabel}>Total Tasks</Text>
          </View>
          <View style={customStyles.summaryItem}>
            <Text style={customStyles.summaryAmount}>{data.stats.totalAssignments}</Text>
            <Text style={customStyles.summaryLabel}>Total Assignments</Text>
          </View>
          <View style={customStyles.summaryItem}>
            <Text style={customStyles.summaryAmount}>₹{data.stats.totalEarnings.toLocaleString()}</Text>
            <Text style={customStyles.summaryLabel}>Total Earnings</Text>
          </View>
        </View>

        {/* Task Breakdown */}
        <Text style={sharedStyles.sectionTitle}>Task Statistics</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={sharedStyles.detailValue}>Completed: {data.stats.completedTasks}</Text>
          <Text style={sharedStyles.detailValue}>Pending: {data.stats.pendingTasks}</Text>
          <Text style={sharedStyles.detailValue}>Reported: {data.stats.reportedTasks}</Text>
        </View>

        <View style={customStyles.sectionBreak} />

        {/* Assignment Breakdown */}
        <Text style={sharedStyles.sectionTitle}>Assignment Statistics</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={sharedStyles.detailValue}>Completed Events: {data.stats.completedEvents}</Text>
          <Text style={sharedStyles.detailValue}>Upcoming Events: {data.stats.upcomingEvents}</Text>
        </View>

        <View style={customStyles.sectionBreak} />

        {/* Earnings Breakdown */}
        <Text style={sharedStyles.sectionTitle}>Earnings Breakdown</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={sharedStyles.detailValue}>Task Earnings: ₹{data.stats.taskEarnings.toLocaleString()}</Text>
          <Text style={sharedStyles.detailValue}>Assignment Earnings: ₹{data.stats.assignmentEarnings.toLocaleString()}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={sharedStyles.detailValue}>Paid Amount: ₹{data.stats.paidAmount.toLocaleString()}</Text>
          <Text style={sharedStyles.detailValue}>Pending Amount: ₹{data.stats.pendingAmount.toLocaleString()}</Text>
        </View>

        <SharedPDFFooter firmData={firmData} />
      </Page>

      {/* Tasks Details Page */}
      {data.tasks.length > 0 && (
        <Page size="A4" style={sharedStyles.page}>
          <SharedPDFHeader firmData={firmData} />

          <Text style={sharedStyles.title}>DETAILED TASKS - {data.profile.full_name.toUpperCase()}</Text>

          <SimpleTable
            headers={['Task', 'Status', 'Priority', 'Due Date', 'Amount', 'Event']}
            rows={data.tasks.map(task => [
              task.title,
              task.status,
              task.priority || 'Medium',
              task.due_date ? new Date(task.due_date).toLocaleDateString('en-IN') : '-',
              task.amount ? `₹${Number(task.amount).toLocaleString()}` : '-',
              task.event?.title || '-'
            ])}
          />

          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}

      {/* Assignments Details Page */}
      {data.assignments.length > 0 && (
        <Page size="A4" style={sharedStyles.page}>
          <SharedPDFHeader firmData={firmData} />

          <Text style={sharedStyles.title}>DETAILED ASSIGNMENTS - {data.profile.full_name.toUpperCase()}</Text>

          <SimpleTable
            headers={['Event', 'Type', 'Date', 'Role', 'Day', 'Client']}
            rows={data.assignments.map(assignment => [
              assignment.event_title,
              assignment.event_type,
              new Date(assignment.event_date).toLocaleDateString('en-IN'),
              assignment.role,
              assignment.day_number.toString(),
              assignment.client_name || '-'
            ])}
          />

          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}
    </Document>
  );
};

export const generateStaffDashboardPDF = async (data: StaffDashboardData) => {
  // Get firm data
  let firmData = null;
  try {
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
        const { data: firm, error } = await supabase
          .from('firms')
          .select('name, description, logo_url, header_left_content, footer_content')
          .eq('id', firmId)
          .single();
        
        if (!error && firm) {
          firmData = firm;
        }
      }
    }
    } catch (error) {
      // Error fetching firm data for PDF
    }

  const blob = await pdf(
    <StaffDashboardDocument data={data} firmData={firmData} />
  ).toBlob();
  
  const fileName = `${data.profile.full_name} Dashboard Report ${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateStaffDashboardPDF;