import { Document, Page, Text, View, StyleSheet, PDFDownloadLink, pdf, Font } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Download01Icon } from 'hugeicons-react';
import { Event } from '@/types/studio';
import { formatEventDateRange } from '@/lib/date-utils';
import { sharedStyles, SharedPDFHeader, SharedPDFFooter } from '@/components/pdf/SharedPDFLayout';
import { supabase } from '@/integrations/supabase/client';

// Register Lexend font from local file
Font.register({
  family: 'Lexend',
  src: '/fonts/Lexend.ttf',
});

interface IndividualEventReportProps {
  event: Event & {
    client?: { name: string };
    event_staff_assignments?: Array<{
      role: string;
      day_number: number;
      profiles?: { full_name: string } | null;
      freelancer?: { full_name: string } | null;
    }>;
    tasks?: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      due_date: string | null;
      assigned_to?: string;
      freelancer_id?: string;
      description?: string;
      assignee?: {
        full_name: string;
      } | null;
      freelancer?: {
        full_name: string;
      } | null;
      assigned_staff?: {
        full_name: string;
      } | null;
    }>;
    payments?: Array<{
      amount: number;
      payment_date: string;
      payment_method: string;
      reference_number?: string;
    }>;
  };
  firmData?: {
    name: string;
    description?: string;
    logo_url?: string;
    header_left_content?: string;
    footer_content?: string;
  };
}

const styles = StyleSheet.create({
  ...sharedStyles,
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
  subtitle: {
    fontSize: 14,
    fontWeight: 600,
    textAlign: 'center',
    color: '#333333',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#c4b28d',
    marginBottom: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: '#f8f6f1',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c4b28d',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 6,
    width: '48%',
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#555555',
    width: 80,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 9,
    color: '#333333',
    flex: 1,
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
    fontSize: 10,
    fontWeight: 600,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    color: '#4B5563',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tableCellLeft: {
    flex: 1,
    fontSize: 9,
    color: '#111827',
    textAlign: 'left',
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontWeight: 500,
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 9,
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontWeight: 600,
  },
  statusCompleted: {
    color: '#059669',
    fontWeight: 600,
  },
  statusInProgress: {
    color: '#2563eb',
    fontWeight: 600,
  },
  statusPending: {
    color: '#d97706',
    fontWeight: 600,
  },
  priorityHigh: {
    color: '#dc2626',
    fontWeight: 600,
  },
  priorityMedium: {
    color: '#2563eb',
    fontWeight: 500,
  },
  priorityLow: {
    color: '#059669',
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
  roleSection: {
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#c4b28d',
  },
  roleTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#c4b28d',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
});

const IndividualEventReportDocument = ({ event, firmData }: IndividualEventReportProps) => {
  const totalDays = (event as any).total_days || 1;
  const totalAmount = event.total_amount || 0;
  const paidAmount = event.payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  const balanceAmount = totalAmount - paidAmount;

  // Get quotation details to show required roles even with 0 assignments
  const quotationDetails = (event as any).quotation_source?.quotation_details || (event as any).quotation_details;
  console.log('Quotation details for PDF:', quotationDetails);

  // Group staff assignments by role and day
  const staffByRole = (event.event_staff_assignments || []).reduce((acc, assignment) => {
    const name = assignment.profiles?.full_name || assignment.freelancer?.full_name || 'Unknown';
    const role = assignment.role?.trim();
    
    if (!role || role === '') {
      console.log('Skipping assignment with missing role:', assignment);
      return acc;
    }
    
    if (!acc[role]) acc[role] = {};
    if (!acc[role][assignment.day_number]) acc[role][assignment.day_number] = [];
    acc[role][assignment.day_number].push(name);
    return acc;
  }, {} as Record<string, Record<number, string[]>>);

  // Get all required roles from quotation, even if no assignments exist
  const getAllRequiredRoles = () => {
    const requiredRoles = new Set<string>();
    
    if (quotationDetails?.days) {
      quotationDetails.days.forEach((day: any) => {
        if (day.photographers > 0) requiredRoles.add('Photographer');
        if (day.cinematographers > 0) requiredRoles.add('Cinematographer');
        if (day.drone > 0) requiredRoles.add('Drone Pilot');
        // Only add Editor if same day editing is enabled
        if (day.same_day_editing || (event as any).same_day_editor) {
          requiredRoles.add('Editor');
        }
      });
    }
    
    // Add any roles that have actual assignments but weren't in quotation
    Object.keys(staffByRole).forEach(role => requiredRoles.add(role));
    
    // Return roles in proper order: Photographers, Cinematographers, Editors, Drone Pilot, Others
    const roleOrder = ['Photographer', 'Cinematographer', 'Editor', 'Drone Pilot'];
    const orderedRoles = [];
    
    roleOrder.forEach(role => {
      if (requiredRoles.has(role)) {
        orderedRoles.push(role);
      }
    });
    
    // Add any other roles not in the standard order
    Array.from(requiredRoles).forEach(role => {
      if (!roleOrder.includes(role)) {
        orderedRoles.push(role);
      }
    });
    
    return orderedRoles;
  };

  const requiredRoles = getAllRequiredRoles();
  console.log('Required roles for PDF:', requiredRoles);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  
  const eventTasks = event.tasks || [];
  const hasTasks = eventTasks.length > 0;

  return (
    <Document>
      {/* Page 1: Event Information & Financial Summary */}
      <Page size="A4" style={styles.page}>
        <SharedPDFHeader firmData={firmData} />

        <Text style={styles.title}>Event Report</Text>
        <Text style={styles.subtitle}>{event.title}</Text>

        {/* Event Information */}
        <Text style={styles.sectionTitle}>Event Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Event Type:</Text>
            <Text style={styles.infoValue}>{event.event_type}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Client:</Text>
            <Text style={styles.infoValue}>{event.client?.name || 'Not specified'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{formatEventDateRange(event.event_date, totalDays, (event as any).event_end_date)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Venue:</Text>
            <Text style={styles.infoValue}>{event.venue || 'Not specified'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Total Days:</Text>
            <Text style={styles.infoValue}>{totalDays}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={styles.infoValue}>
              {new Date(event.event_date) <= new Date() ? 'Completed' : 'Upcoming'}
            </Text>
          </View>
          {event.description && (
            <View style={[styles.infoItem, { width: '100%' }]}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>{event.description}</Text>
            </View>
          )}
        </View>

        {/* Financial Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Financial Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid Amount:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(paidAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance Amount:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(balanceAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment Status:</Text>
            <Text style={styles.summaryValue}>
              {balanceAmount <= 0 ? 'Fully Paid' : 'Pending Payment'}
            </Text>
          </View>
        </View>

        {/* Payment History */}
        {(event.payments && event.payments.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Payment History</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellHeader}>Date</Text>
                <Text style={styles.tableCellHeader}>Amount</Text>
                <Text style={styles.tableCellHeader}>Method</Text>
                <Text style={styles.tableCellHeader}>Reference</Text>
              </View>
              
              {event.payments.map((payment, index) => (
                <View key={index} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={styles.tableCell}>
                    {new Date(payment.payment_date).toLocaleDateString('en-IN')}
                  </Text>
                  <Text style={styles.tableCellAmount}>
                    {formatCurrency(payment.amount)}
                  </Text>
                  <Text style={styles.tableCell}>{payment.payment_method}</Text>
                  <Text style={styles.tableCell}>
                    {payment.reference_number || 'N/A'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </Page>

      {/* Page 2: Staff Assignments - Show all required roles from quotation */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Crew Assignments</Text>
        
        <Text style={styles.sectionTitle}>Staff Assignments by Role</Text>
        
        {requiredRoles.map(role => {
          const roleDays = staffByRole[role] || {};
          
          // Get required count for this role from quotation
          const getRequiredCount = (dayIndex: number) => {
            if (!quotationDetails?.days || !quotationDetails.days[dayIndex - 1]) return 0;
            const dayConfig = quotationDetails.days[dayIndex - 1];
            
            switch (role) {
              case 'Photographer': return dayConfig.photographers || 0;
              case 'Cinematographer': return dayConfig.cinematographers || 0;
              case 'Drone Pilot': return dayConfig.drone || 0;
              case 'Editor': return 1; // Standard single editor
              default: return 0;
            }
          };
          
          return (
            <View key={role} style={styles.roleSection}>
              <Text style={styles.roleTitle}>{role}s</Text>
              
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Day</Text>
                  <Text style={styles.tableCellHeader}>Required</Text>
                  <Text style={styles.tableCellHeader}>Assigned</Text>
                  <Text style={[styles.tableCellHeader, { flex: 3 }]}>Staff Names</Text>
                </View>
                
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                  const dayStaff = roleDays[day] || [];
                  const requiredCount = getRequiredCount(day);
                  const assignedCount = dayStaff.length;
                  
                  return (
                    <View key={day} style={day % 2 === 1 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={[styles.tableCell, { flex: 1.5 }]}>Day {day}</Text>
                      <Text style={styles.tableCell}>{requiredCount}</Text>
                      <Text style={styles.tableCell}>{assignedCount}</Text>
                      <Text style={[styles.tableCellLeft, { flex: 3 }]}>
                        {assignedCount > 0 ? dayStaff.join(', ') : 'No crew assigned'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
        
        {requiredRoles.length === 0 && (
          <View style={styles.roleSection}>
            <Text style={styles.roleTitle}>No Requirements Found</Text>
            <Text style={styles.tableCell}>No crew requirements specified in quotation</Text>
          </View>
        )}
        
        {!hasTasks && <SharedPDFFooter firmData={firmData} />}
      </Page>

      {/* Page 3: Tasks - Only show if tasks exist */}
      {hasTasks && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.title}>Event Tasks</Text>

          <Text style={styles.sectionTitle}>Task Details</Text>
          
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { flex: 2.5 }]}>Task Title</Text>
              <Text style={[styles.tableCellHeader, { flex: 1.5 }]}>Assigned To</Text>
              <Text style={styles.tableCellHeader}>Status</Text>
              <Text style={styles.tableCellHeader}>Priority</Text>
              <Text style={styles.tableCellHeader}>Due Date</Text>
            </View>
            
            {event.tasks!.map((task, index) => (
              <View key={task.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <View style={{ flex: 2.5, paddingHorizontal: 4 }}>
                  <Text style={[styles.tableCell, { fontWeight: 600, textAlign: 'center' }]}>{task.title}</Text>
                  {task.description && (
                    <Text style={[styles.tableCell, { fontSize: 7, color: '#666', marginTop: 2, textAlign: 'center' }]}>
                      {task.description.length > 60 
                        ? task.description.substring(0, 60) + '...'
                        : task.description
                      }
                    </Text>
                  )}
                </View>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>
                  {(task as any).freelancer?.full_name || (task as any).assigned_staff?.full_name || task.assignee?.full_name || 'Unassigned'}
                </Text>
                <Text style={[
                  styles.tableCell, 
                  task.status === 'Completed' ? styles.statusCompleted :
                  task.status === 'In Progress' ? styles.statusInProgress :
                  styles.statusPending
                ]}>
                  {task.status}
                </Text>
                <Text style={[
                  styles.tableCell,
                  task.priority === 'High' || task.priority === 'Urgent' ? styles.priorityHigh :
                  task.priority === 'Medium' ? styles.priorityMedium :
                  styles.priorityLow
                ]}>
                  {task.priority}
                </Text>
                <Text style={styles.tableCell}>
                  {task.due_date 
                    ? new Date(task.due_date).toLocaleDateString('en-IN')
                    : 'Not set'
                  }
                </Text>
              </View>
            ))}
          </View>

          <SharedPDFFooter firmData={firmData} />
        </Page>
      )}
    </Document>
  );
};

export const IndividualEventReportButton = ({ event }: { event: IndividualEventReportProps['event'] }) => {
  return (
    <PDFDownloadLink
      document={<IndividualEventReportDocument event={event} />}
      fileName={`event-report-${event.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`}
    >
      {({ loading }) => (
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className="gap-2 w-full"
        >
          <Download01Icon className="h-4 w-4" />
          {loading ? 'Generating...' : 'Event Report'}
        </Button>
      )}
    </PDFDownloadLink>
  );
};

export const generateIndividualEventReport = async (event: IndividualEventReportProps['event']) => {
  try {
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

    const blob = await pdf(<IndividualEventReportDocument event={event} firmData={firmData} />).toBlob();
    
    const fileName = `event-report-${event.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Error generating individual event report:', error);
    return { success: false, error };
  }
};

export default IndividualEventReportDocument;