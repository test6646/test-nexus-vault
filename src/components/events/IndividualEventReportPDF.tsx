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
      staff_id?: string;
      freelancer_id?: string;
      profiles?: { full_name: string } | null;
      freelancer?: { full_name: string } | null;
      staff?: { full_name: string } | null; // Add staff alias for consistency
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
      amount?: number;
      assignee?: {
        full_name: string;
      } | null;
      freelancer?: {
        full_name: string;
      } | null;
      assigned_staff?: {
        full_name: string;
      } | null;
      // Support the new relationship structure from the query
      assigned_to_profile?: {
        full_name: string;
      } | null;
    }>;
    payments?: Array<{
      amount: number;
      payment_date: string;
      payment_method: string;
      reference_number?: string;
    }>;
    expenses?: Array<{
      id: string;
      description: string;
      category: string;
      amount: number;
      expense_date: string;
    }>;
    staff_payments?: Array<{
      id: string;
      amount: number;
      payment_date: string;
      description?: string;
      profiles?: { full_name: string };
    }>;
    freelancer_payments?: Array<{
      id: string;
      amount: number;
      payment_date: string;
      description?: string;
      freelancers?: { full_name: string };
    }>;
    event_closing_balances?: Array<{
      id: string;
      closing_amount: number;
      closing_reason?: string;
      created_at: string;
    }>;
    assignment_rates?: Array<{
      staff_id?: string;
      freelancer_id?: string;
      rate: number;
      quantity: number;
      role: string;
      day_number: number;
    }>;
    freelancer_details?: Array<{
      id: string;
      full_name: string;
      role: string;
    }>;
    staff_details?: Array<{
      id: string;
      full_name: string;
      role: string;
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
    fontSize: 11,
    fontWeight: 600,
    color: '#c4b28d',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    padding: 8,
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
    marginVertical: 8,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#c4b28d',
    padding: 6,
    justifyContent: 'space-between',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    justifyContent: 'space-between',
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 9,
    fontWeight: 600,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tableCell: {
    flex: 1,
    fontSize: 8,
    color: '#4B5563',
    textAlign: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableCellLeft: {
    flex: 1,
    fontSize: 8,
    color: '#111827',
    textAlign: 'left',
    paddingHorizontal: 3,
    paddingVertical: 2,
    fontWeight: 500,
  },
  tableCellAmount: {
    flex: 1,
    fontSize: 8,
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
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
    marginBottom: 12,
    padding: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#c4b28d',
  },
  roleTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#c4b28d',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  profitText: {
    fontSize: 14,
    fontWeight: 700,
    color: '#22c55e', // Pastel green for profit
    textAlign: 'center',
  },
  lossText: {
    fontSize: 14,
    fontWeight: 700,
    color: '#ef4444', // Pastel red for loss
    textAlign: 'center',
  },
  neutralText: {
    fontSize: 14,
    fontWeight: 700,
    color: '#3b82f6', // Pastel blue for neutral
    textAlign: 'center',
  },
  financialBreakdownSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  tableCellCenter: {
    flex: 1,
    fontSize: 8,
    color: '#4B5563',
    textAlign: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const IndividualEventReportDocument = ({ event, firmData }: IndividualEventReportProps) => {
  const totalDays = (event as any).total_days || 1;
  const totalAmount = event.total_amount || 0;
  const advanceAmount = event.advance_amount || 0;
  const paymentsAmount = event.payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
  const paidAmount = advanceAmount + paymentsAmount;
  const closedAmount = event.event_closing_balances?.reduce((sum, closing) => sum + (closing.closing_amount || 0), 0) || 0;
  const balanceAmount = Math.max(0, totalAmount - paidAmount - closedAmount);

  // Get quotation details to show required roles even with 0 assignments
  // Try different possible data structures for quotation details
  const quotationDetails = 
    (event as any).quotation_source?.quotation_details || // Direct quotation_source.quotation_details
    (event as any).quotation_source?.[0]?.quotation_details || // Array format quotation_source[0].quotation_details
    (event as any).quotation_details; // Direct quotation_details

  // Group staff assignments by role and day - SEPARATE staff and freelancers
  const staffByRole = (event.event_staff_assignments || []).reduce((acc, assignment) => {
    const role = assignment.role?.trim();
    
    if (!role || role === '') {
      return acc;
    }
    
    if (!acc[role]) acc[role] = {};
    if (!acc[role][assignment.day_number]) acc[role][assignment.day_number] = { staff: [], freelancers: [] };
    
    // Separate staff and freelancers - fixed staff name access
    if (assignment.staff_id) {
      const staffName = assignment.staff?.full_name || assignment.profiles?.full_name || 'Unknown Staff';
      acc[role][assignment.day_number].staff.push(staffName);
    }
    if (assignment.freelancer_id) {
      const freelancerName = assignment.freelancer?.full_name || 'Unknown Freelancer';
      acc[role][assignment.day_number].freelancers.push(freelancerName);
    }
    
    return acc;
  }, {} as Record<string, Record<number, { staff: string[], freelancers: string[] }>>);

  // Get all required roles from quotation, even if no assignments exist
  const getAllRequiredRoles = () => {
    const requiredRoles = new Set<string>();
    
    // Add all roles that have quotation requirements, regardless of count
    if (quotationDetails?.days) {
      quotationDetails.days.forEach((day: any) => {
        // Add role if it's specified in quotation (even if count is 0)
        if (day.hasOwnProperty('photographers')) requiredRoles.add('Photographer');
        if (day.hasOwnProperty('cinematographers')) requiredRoles.add('Cinematographer');  
        if (day.hasOwnProperty('drone')) requiredRoles.add('Drone Pilot');
      });
      
      // Add Same Day Editor if same day editing is enabled in quotation
      if (quotationDetails.sameDayEditing || (event as any).same_day_editor) {
        requiredRoles.add('Same Day Editor');
      }
    }
    
    // Add any roles that have actual assignments but weren't in quotation
    Object.keys(staffByRole).forEach(role => requiredRoles.add(role));
    
    // If no quotation details found, show at least the assigned roles
    if (requiredRoles.size === 0) {
      Object.keys(staffByRole).forEach(role => requiredRoles.add(role));
    }
    
    // Return roles in proper order: Photographers, Cinematographers, Same Day Editor, Drone Pilot, Others
    const roleOrder = ['Photographer', 'Cinematographer', 'Same Day Editor', 'Drone Pilot'];
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
          {(event as any).storage_disk && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Storage Disk:</Text>
              <Text style={styles.infoValue}>{(event as any).storage_disk}</Text>
            </View>
          )}
          {(event as any).storage_size && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Storage Size:</Text>
              <Text style={styles.infoValue}>
                {(event as any).storage_size >= 1024 
                  ? `${((event as any).storage_size / 1024).toFixed(1)} TB`
                  : `${(event as any).storage_size} GB`
                }
              </Text>
            </View>
          )}
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
            <Text style={styles.summaryLabel}>Advance Amount:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(advanceAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Collected Amount:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(paymentsAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Paid:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(paidAmount)}</Text>
          </View>
          {closedAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Closed Amount:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(closedAmount)}</Text>
            </View>
          )}
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
          
          // Get required count for this role from quotation - show actual counts
          const getRequiredCount = (dayIndex: number) => {
            if (!quotationDetails?.days || !quotationDetails.days[dayIndex - 1]) {
              return 0; // Return 0 if no quotation data
            }
            const dayConfig = quotationDetails.days[dayIndex - 1];
            
            switch (role) {
              case 'Photographer': return dayConfig.photographers || 0;
              case 'Cinematographer': return dayConfig.cinematographers || 0;
              case 'Drone Pilot': return dayConfig.drone || 0;
              case 'Same Day Editor': return (quotationDetails.sameDayEditing || (event as any).same_day_editor) ? (dayConfig.sameDayEditors || 1) : 0;
              case 'Editor': return 0; // Regular editors don't get assigned to events
              default: return 0;
            }
          };
          
          return (
            <View key={role} style={styles.roleSection}>
              <Text style={styles.roleTitle}>{role}s</Text>
              
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCellHeader, { flex: 1.2 }]}>Day</Text>
                  <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>Required</Text>
                  <Text style={[styles.tableCellHeader, { flex: 0.8 }]}>Assigned</Text>
                  <Text style={[styles.tableCellHeader, { flex: 2 }]}>Staff Members</Text>
                  <Text style={[styles.tableCellHeader, { flex: 2 }]}>Freelancers</Text>
                </View>
                
                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                  const dayAssignments = roleDays[day] || { staff: [], freelancers: [] };
                  const requiredCount = getRequiredCount(day);
                  const totalAssigned = dayAssignments.staff.length + dayAssignments.freelancers.length;
                  
                  return (
                    <View key={day} style={day % 2 === 1 ? styles.tableRow : styles.tableRowAlt}>
                      <Text style={[styles.tableCell, { flex: 1.2 }]}>Day {day}</Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>{requiredCount}</Text>
                      <Text style={[styles.tableCell, { flex: 0.8 }]}>{totalAssigned}</Text>
                      <Text style={[styles.tableCellCenter, { flex: 2 }]}>
                        {dayAssignments.staff.length > 0 ? dayAssignments.staff.join(', ') : 'None assigned'}
                      </Text>
                      <Text style={[styles.tableCellCenter, { flex: 2 }]}>
                        {dayAssignments.freelancers.length > 0 ? dayAssignments.freelancers.join(', ') : 'None assigned'}
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
                <Text style={[styles.tableCellCenter, { flex: 1.5 }]}>
                  {(task as any).assigned_staff?.full_name || (task as any).assignee?.full_name || (task as any).assigned_to_profile?.full_name || (task as any).freelancer?.full_name || 'Unassigned'}
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

      {/* Page 4: Financial Breakdown - Simplified */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Financial Details</Text>
        
        {/* All Financial Items in Simple List Format */}
        <View style={[styles.summarySection, { marginBottom: 20 }]}>
          <Text style={styles.summaryTitle}>Event Related Financials</Text>
          
          {/* Expenses */}
          {event.expenses && event.expenses.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 8, marginTop: 12 }]}>Expenses</Text>
              {event.expenses.map((expense, index) => (
                <View key={expense.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{expense.description} ({expense.category}):</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(expense.amount)}</Text>
                </View>
              ))}
            </>
          )}
          
          {/* Tasks with Amounts */}
          {event.tasks && event.tasks.filter(task => task.amount && task.amount > 0).length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 8, marginTop: 12 }]}>Task Amounts</Text>
              {event.tasks.filter(task => task.amount && task.amount > 0).map((task, index) => (
                <View key={task.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{task.title}:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(task.amount!)}</Text>
                </View>
              ))}
            </>
          )}
          
          {/* Staff Salary Costs - Simplified */}
          <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 8, marginTop: 12 }]}>Staff Salary Costs</Text>
          
          {/* Calculate staff costs from assignment rates and show payments */}
          {(() => {
            // Get all staff assignment rates grouped by person
            const staffCosts = (event.assignment_rates || [])
              .filter(rate => rate.staff_id)
              .reduce((acc, rate) => {
                const existing = acc.find(item => item.staff_id === rate.staff_id);
                if (existing) {
                  existing.total += rate.rate * rate.quantity;
                  existing.roles.push(`${rate.role} (Day ${rate.day_number})`);
                } else {
                  // Find staff name directly from fetched staff details
                  const staff = event.staff_details?.find(s => s.id === rate.staff_id);
                  const staffName = staff?.full_name || 'Unknown Staff';
                  
                  acc.push({
                    staff_id: rate.staff_id,
                    name: staffName,
                    total: rate.rate * rate.quantity,
                    roles: [`${rate.role} (Day ${rate.day_number})`]
                  });
                }
                return acc;
              }, [] as Array<{staff_id: string, name: string, total: number, roles: string[]}>);
            
            // Create payment map
            const staffPaymentMap = new Map();
            (event.staff_payments || []).forEach(payment => {
              const name = payment.profiles?.full_name || 'Unknown Staff';
              if (!staffPaymentMap.has(name)) {
                staffPaymentMap.set(name, 0);
              }
              staffPaymentMap.set(name, staffPaymentMap.get(name) + payment.amount);
            });
            
            return staffCosts.map((staff, index) => {
              const paidAmount = staffPaymentMap.get(staff.name) || 0;
              return (
                <View key={staff.staff_id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{staff.name} ({staff.roles.join(', ')}):</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(staff.total)}
                  </Text>
                </View>
              );
            });
          })()}
          
          {/* Freelancer Salary Costs - Simplified */}
          <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 8, marginTop: 12 }]}>Freelancer Salary Costs</Text>
          
          {/* Calculate freelancer costs from assignment rates and show payments */}
          {(() => {
            // Get all freelancer assignment rates grouped by person
            const freelancerCosts = (event.assignment_rates || [])
              .filter(rate => rate.freelancer_id)
              .reduce((acc, rate) => {
                const existing = acc.find(item => item.freelancer_id === rate.freelancer_id);
                if (existing) {
                  existing.total += rate.rate * rate.quantity;
                  existing.roles.push(`${rate.role} (Day ${rate.day_number})`);
                 } else {
                   // Find freelancer name directly from fetched freelancer details
                   const freelancer = event.freelancer_details?.find(f => f.id === rate.freelancer_id);
                   const freelancerName = freelancer?.full_name || 'Unknown Freelancer';
                   
                   acc.push({
                     freelancer_id: rate.freelancer_id,
                     name: freelancerName,
                     total: rate.rate * rate.quantity,
                     roles: [`${rate.role} (Day ${rate.day_number})`]
                   });
                 }
                return acc;
              }, [] as Array<{freelancer_id: string, name: string, total: number, roles: string[]}>);
            
            // Create payment map
            const freelancerPaymentMap = new Map();
            (event.freelancer_payments || []).forEach(payment => {
              const name = payment.freelancers?.full_name || 'Unknown Freelancer';
              if (!freelancerPaymentMap.has(name)) {
                freelancerPaymentMap.set(name, 0);
              }
              freelancerPaymentMap.set(name, freelancerPaymentMap.get(name) + payment.amount);
            });
            
            return freelancerCosts.map((freelancer, index) => {
              const paidAmount = freelancerPaymentMap.get(freelancer.name) || 0;
              return (
                <View key={freelancer.freelancer_id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{freelancer.name} ({freelancer.roles.join(', ')}):</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(freelancer.total)}
                  </Text>
                </View>
              );
            });
          })()}
          
          {/* Closed Amounts */}
          {event.event_closing_balances && event.event_closing_balances.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { fontSize: 10, marginBottom: 8, marginTop: 12 }]}>Closed Amounts</Text>
              {event.event_closing_balances.map((closing, index) => (
                <View key={closing.id} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Closed Amount ({closing.closing_reason || 'Reason not specified'}):</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(closing.closing_amount)}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </Page>

      {/* Page 5: Profit/Loss Analysis - Separate Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Profit/Loss Analysis</Text>
        
        <View style={styles.financialBreakdownSection}>
          <Text style={styles.summaryTitle}>Financial Calculation</Text>
          
          {(() => {
            const eventRevenue = totalAmount;
            const totalExpenses = (event.expenses || []).reduce((sum, expense) => sum + expense.amount, 0);
            const totalTaskAmounts = (event.tasks || []).filter(task => task.amount && task.amount > 0).reduce((sum, task) => sum + (task.amount || 0), 0);
            
            // Calculate salary costs from assignment rates directly (no matter if paid or not)
            const totalStaffCosts = (event.assignment_rates || [])
              .filter(rate => rate.staff_id)
              .reduce((sum, rate) => sum + (rate.rate * rate.quantity), 0);
            const totalFreelancerCosts = (event.assignment_rates || [])
              .filter(rate => rate.freelancer_id)
              .reduce((sum, rate) => sum + (rate.rate * rate.quantity), 0);
            
            const totalClosedAmounts = (event.event_closing_balances || []).reduce((sum, closing) => sum + closing.closing_amount, 0);
            
            const totalCosts = totalExpenses + totalTaskAmounts + totalStaffCosts + totalFreelancerCosts + totalClosedAmounts;
            const netProfit = eventRevenue - totalCosts;
            
            return (
              <>
                <View style={[styles.summaryRow, { marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }]}>
                  <Text style={[styles.summaryLabel, { fontSize: 12, fontWeight: 700 }]}>Event Bill Amount:</Text>
                  <Text style={[styles.summaryValue, { fontSize: 12, fontWeight: 700 }]}>{formatCurrency(eventRevenue)}</Text>
                </View>
                
                <Text style={[styles.sectionTitle, { fontSize: 11, marginBottom: 12 }]}>Cost Breakdown</Text>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Expenses (Non-Salary):</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Task Amounts:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(totalTaskAmounts)}</Text>
                </View>
                 <View style={styles.summaryRow}>
                   <Text style={styles.summaryLabel}>Staff Salary:</Text>
                   <Text style={styles.summaryValue}>{formatCurrency(totalStaffCosts)}</Text>
                 </View>
                 <View style={styles.summaryRow}>
                   <Text style={styles.summaryLabel}>Freelancer Payments:</Text>
                   <Text style={styles.summaryValue}>{formatCurrency(totalFreelancerCosts)}</Text>
                 </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Closed Amounts:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(totalClosedAmounts)}</Text>
                </View>
                
                <View style={[styles.summaryRow, { borderTopWidth: 2, borderTopColor: '#dc2626', paddingTop: 12, marginTop: 16 }]}>
                  <Text style={[styles.summaryLabel, { fontWeight: 700, fontSize: 11, color: '#dc2626' }]}>Total Costs:</Text>
                  <Text style={[styles.summaryValue, { fontWeight: 700, fontSize: 11, color: '#dc2626' }]}>{formatCurrency(totalCosts)}</Text>
                </View>
                
                <View style={[styles.summaryRow, { marginTop: 24, paddingTop: 16, borderTopWidth: 3, borderTopColor: netProfit > 0 ? '#22c55e' : netProfit < 0 ? '#ef4444' : '#3b82f6' }]}>
                  <Text style={[styles.summaryLabel, { fontWeight: 700, fontSize: 14 }]}>Net Result:</Text>
                  <Text style={[
                    netProfit > 0 ? styles.profitText : 
                    netProfit < 0 ? styles.lossText : 
                    styles.neutralText,
                    { fontSize: 16, fontWeight: 700 }
                  ]}>
                    {formatCurrency(Math.abs(netProfit))} {netProfit < 0 ? '(LOSS)' : netProfit > 0 ? '(PROFIT)' : '(BREAK EVEN)'}
                  </Text>
                </View>
                
                <View style={[styles.summaryRow, { marginTop: 12, justifyContent: 'center' }]}>
                  <Text style={[
                    netProfit > 0 ? styles.profitText : 
                    netProfit < 0 ? styles.lossText : 
                    styles.neutralText,
                    { fontSize: 12, fontWeight: 500, textAlign: 'center' }
                  ]}>
                    Calculation: ₹{eventRevenue.toLocaleString()} - ₹{totalCosts.toLocaleString()} = ₹{Math.abs(netProfit).toLocaleString()}
                  </Text>
                </View>
              </>
            );
          })()}
        </View>

        <SharedPDFFooter firmData={firmData} />
      </Page>
    </Document>
  );
};

export const IndividualEventReportButton = ({ event }: { event: IndividualEventReportProps['event'] }) => {
  return (
    <PDFDownloadLink
      document={<IndividualEventReportDocument event={event} />}
      fileName={`${event.title.replace(/[^a-zA-Z0-9\s&]/g, ' ').replace(/\s+/g, ' ').trim()} Event Report ${new Date().toISOString().split('T')[0]}.pdf`}
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

const generateIndividualEventReport = async (event: IndividualEventReportProps['event']) => {
  try {
    // Get firm data using localStorage firm ID with proper user-specific fallbacks
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
      // Error fetching firm data for Individual Event PDF
    }

    // Fetch event-related financial data
    const enhancedEvent = { ...event } as any;
    
    try {
      // First, fetch the quotation data if event has quotation_source_id
      if ((event as any).quotation_source_id) {
        const { data: quotationData } = await supabase
          .from('quotations')
          .select('id, quotation_details')
          .eq('id', (event as any).quotation_source_id)
          .single();
        
        if (quotationData) {
          enhancedEvent.quotation_source = quotationData;
        }
      }
      
      // Fetch event-related expenses (non-salary)
      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, description, category, amount, expense_date')
        .eq('event_id', event.id)
        .neq('category', 'Salary'); // Exclude salary expenses
      
      // Fetch staff payments for this event AND related staff
      // First get all staff who worked on this event
      const { data: eventStaff } = await supabase
        .from('event_staff_assignments')
        .select('staff_id')
        .eq('event_id', event.id);
      
      const staffIds = eventStaff?.map(assignment => assignment.staff_id).filter(Boolean) || [];
      
      // Fetch staff payments that are either directly linked to event OR made to staff who worked on event
      const { data: staffPayments } = await supabase
        .from('staff_payments')
        .select(`
          id, amount, payment_date, description,
          staff_id, event_id
        `)
        .or(`event_id.eq.${event.id}${staffIds.length > 0 ? `,staff_id.in.(${staffIds.join(',')})` : ''}`);
      
      // Get staff names separately
      let staffPaymentsWithNames = staffPayments || [];
      if (staffPayments && staffPayments.length > 0) {
        const staffIds = staffPayments.map(p => p.staff_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', staffIds);
        
        staffPaymentsWithNames = staffPayments.map(payment => ({
          ...payment,
          profiles: profiles?.find(p => p.id === payment.staff_id) || null
        }));
      }
      
      // Fetch freelancer payments for this event AND related freelancers
      // First get all freelancers who worked on this event
      const { data: eventFreelancers } = await supabase
        .from('event_staff_assignments')
        .select('freelancer_id')
        .eq('event_id', event.id);
      
      const freelancerIds = eventFreelancers?.map(assignment => assignment.freelancer_id).filter(Boolean) || [];
      
      // Fetch freelancer payments that are either directly linked to event OR made to freelancers who worked on event
      const { data: freelancerPayments } = await supabase
        .from('freelancer_payments')
        .select(`
          id, amount, payment_date, description,
          freelancer_id, event_id
        `)
        .or(`event_id.eq.${event.id}${freelancerIds.length > 0 ? `,freelancer_id.in.(${freelancerIds.join(',')})` : ''}`);
      
      // Get freelancer names separately
      let freelancerPaymentsWithNames = freelancerPayments || [];
      if (freelancerPayments && freelancerPayments.length > 0) {
        const freelancerIds = freelancerPayments.map(p => p.freelancer_id);
        const { data: freelancers } = await supabase
          .from('freelancers')
          .select('id, full_name')
          .in('id', freelancerIds);
        
        freelancerPaymentsWithNames = freelancerPayments.map(payment => ({
          ...payment,
          freelancers: freelancers?.find(f => f.id === payment.freelancer_id) || null
        }));
      }
      
      // Fetch closed balances for this event
      const { data: closingBalances } = await supabase
        .from('event_closing_balances')
        .select('id, closing_amount, closing_reason, created_at')
        .eq('event_id', event.id);
      
      // Also fetch assignment rates for this event to calculate potential salary costs
      const { data: assignmentRates } = await supabase
        .from('event_assignment_rates')
        .select(`
          staff_id, freelancer_id, rate, quantity, role, day_number
        `)
        .eq('event_id', event.id);
      
      // Get all freelancer IDs from assignment rates and fetch their details
      const freelancerIdsFromRates = assignmentRates?.map(rate => rate.freelancer_id).filter(Boolean) || [];
      let freelancerDetails = [];
      if (freelancerIdsFromRates.length > 0) {
        const { data: freelancersFromRates } = await supabase
          .from('freelancers')
          .select('id, full_name, role')
          .in('id', freelancerIdsFromRates);
        freelancerDetails = freelancersFromRates || [];
      }
      
      // Get all staff IDs from assignment rates and fetch their details  
      const staffIdsFromRates = assignmentRates?.map(rate => rate.staff_id).filter(Boolean) || [];
      let staffDetails = [];
      if (staffIdsFromRates.length > 0) {
        const { data: staffFromRates } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('id', staffIdsFromRates);
        staffDetails = staffFromRates || [];
      }
      
      // Fetch tasks with proper staff and freelancer relationships
      const { data: eventTasks } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_staff:profiles!tasks_assigned_to_fkey(full_name, role),
          freelancer:freelancers!tasks_freelancer_id_fkey(full_name, role)
        `)
        .eq('event_id', event.id);
      
      // Fetch event staff assignments WITH freelancer details to fix "Unknown Freelancer" issue
      const { data: eventStaffAssignments } = await supabase
        .from('event_staff_assignments')
        .select(`
          *,
          staff:profiles(id, full_name, role),
          freelancer:freelancers!event_staff_assignments_freelancer_id_fkey(id, full_name, role, phone, email)
        `)
        .eq('event_id', event.id);
      
      enhancedEvent.expenses = expenses || [];
      enhancedEvent.staff_payments = staffPaymentsWithNames || [];
      enhancedEvent.freelancer_payments = freelancerPaymentsWithNames || [];
      enhancedEvent.event_closing_balances = closingBalances || [];
      enhancedEvent.assignment_rates = assignmentRates || [];
      enhancedEvent.event_staff_assignments = eventStaffAssignments || [];
      enhancedEvent.freelancer_details = freelancerDetails || [];
      enhancedEvent.staff_details = staffDetails || [];
      enhancedEvent.tasks = eventTasks || [];
      
    } catch (error) {
      console.error('Error fetching event financial data:', error);
      // Continue with empty arrays if fetch fails
      enhancedEvent.expenses = [];
      enhancedEvent.staff_payments = [];
      enhancedEvent.freelancer_payments = [];
      enhancedEvent.event_closing_balances = [];
      enhancedEvent.assignment_rates = [];
      enhancedEvent.event_staff_assignments = [];
      enhancedEvent.freelancer_details = [];
      enhancedEvent.tasks = [];
    }

    const blob = await pdf(<IndividualEventReportDocument event={enhancedEvent} firmData={firmData} />).toBlob();
    
    const fileName = `${event.title.replace(/[^a-zA-Z0-9\s&]/g, ' ').replace(/\s+/g, ' ').trim()} Event Report ${new Date().toISOString().split('T')[0]}.pdf`;
    
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

export { generateIndividualEventReport };
export default IndividualEventReportDocument;