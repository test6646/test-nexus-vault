import { Document, Page, Text, View, pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { Task } from '@/types/studio';
import { formatDate } from '@/lib/date-utils';
import { SharedPDFHeader, SharedPDFFooter, SimpleTable, sharedStyles } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

interface TaskReportProps {
  tasks: Task[];
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

const TaskReportDocument: React.FC<TaskReportProps> = ({ tasks, filterType, filterValue, firmData }) => {
  const currentDate = formatDate(new Date());
  
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    pending: tasks.filter(t => t.status === 'Waiting for Response').length,
    totalAmount: tasks.reduce((sum, task) => sum + (task.amount || 0), 0),
  };

  const getFilterDisplayText = () => {
    if (filterType === 'global') return 'All Tasks';
    if (filterType === 'staff') return `Staff: ${filterValue}`;
    if (filterType === 'status') return `Status: ${filterValue}`;
    return filterValue;
  };

  const tableData = tasks.slice(0, 25).map(task => [
    task.title,
    task.task_type,
    task.status,
    task.priority,
    task.amount ? `₹${task.amount.toLocaleString()}` : '-'
  ]);

  return (
    <Document>
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>Task Report</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Report Information</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Generated:</Text>
              <Text style={sharedStyles.detailValue}>{currentDate}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Tasks:</Text>
              <Text style={sharedStyles.detailValue}>{taskStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Filter:</Text>
              <Text style={sharedStyles.detailValue}>{getFilterDisplayText()}</Text>
            </View>
          </View>
        </View>

        <SimpleTable
          headers={['Title', 'Type', 'Status', 'Priority', 'Amount']}
          rows={tableData}
        />

        <SharedPDFFooter firmData={firmData} />
      </Page>

      {/* Summary on Separate Page */}
      <Page size="A4" style={sharedStyles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={sharedStyles.title}>TASK SUMMARY</Text>

        <View style={sharedStyles.detailsContainer}>
          <View style={sharedStyles.column}>
            <Text style={sharedStyles.sectionTitle}>Task Statistics</Text>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Tasks:</Text>
              <Text style={sharedStyles.detailValue}>{taskStats.total}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Completed:</Text>
              <Text style={sharedStyles.detailValue}>{taskStats.completed}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>In Progress:</Text>
              <Text style={sharedStyles.detailValue}>{taskStats.inProgress}</Text>
            </View>
            <View style={sharedStyles.detailRow}>
              <Text style={sharedStyles.detailLabel}>Total Amount:</Text>
              <Text style={sharedStyles.detailValue}>₹{taskStats.totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const generateTaskReportPDF = async (tasks: Task[], filterType: string, filterValue: string) => {
  // Get current user's firm data
  let firmData = null;
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_firm_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (profile?.current_firm_id) {
      const { data: firm } = await supabase
        .from('firms')
        .select('name, description, logo_url')
        .eq('id', profile.current_firm_id)
        .single();
      
      firmData = firm;
    }
  } catch (error) {
    console.error('Error fetching firm data for PDF:', error);
  }

  const blob = await pdf(<TaskReportDocument tasks={tasks} filterType={filterType} filterValue={filterValue} firmData={firmData} />).toBlob();
  const fileName = `task-report-${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, fileName);
};

export default generateTaskReportPDF;