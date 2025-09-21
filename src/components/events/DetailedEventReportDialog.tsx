import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar01Icon, 
  Location01Icon, 
  UserGroupIcon, 
  Time01Icon, 
  FileEditIcon, 
  UserCheck01Icon,
  Download01Icon,
  Call02Icon,
  AiMailIcon,
  Loading03Icon
} from 'hugeicons-react';
import { Event } from '@/types/studio';
import { formatEventDateRange } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateIndividualEventReport } from './IndividualEventReportPDF';

interface DetailedEventReportDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DetailedEventReportDialog = ({ event, open, onOpenChange }: DetailedEventReportDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [enhancedEvent, setEnhancedEvent] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (event && open) {
      loadEventDetails();
    }
  }, [event, open]);

  const loadEventDetails = async () => {
    if (!event) return;

    try {
      setLoading(true);

      // Fetch detailed event data with all relationships INCLUDING quotation data
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(name, phone, email),
          quotation_source:quotations(
            id,
            quotation_details
          ),
          event_staff_assignments(
            *,
            staff:profiles(id, full_name, role),
            freelancer:freelancers(id, full_name, role)
          ),
          expenses(
            id,
            amount,
            expense_date,
            description,
            category,
            payment_method,
            notes
          ),
          event_assignment_rates(
            *,
            staff:profiles(full_name),
            freelancer:freelancers(full_name)
          ),
          event_closing_balances(
            id,
            closing_amount,
            closing_reason
          ),
          tasks(
            id,
            title,
            amount,
            status,
            priority,
            assigned_to,
            freelancer_id
          )
        `)
        .eq('id', event.id)
        .single();

      if (eventError) throw eventError;

      // Fetch payments separately
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          reference_number,
          notes
        `)
        .eq('event_id', event.id);

      if (paymentsError) throw paymentsError;

      // Fetch staff payments for this event
      const { data: staffPaymentsData, error: staffPaymentsError } = await supabase
        .from('staff_payments')
        .select(`
          id,
          amount,
          payment_date,
          description,
          staff_id,
          profiles!staff_payments_staff_id_fkey(full_name)
        `)
        .eq('event_id', event.id);

      if (staffPaymentsError) throw staffPaymentsError;

      // Fetch freelancer payments for this event
      const { data: freelancerPaymentsData, error: freelancerPaymentsError } = await supabase
        .from('freelancer_payments')
        .select(`
          id,
          amount,
          payment_date,
          description,
          freelancer_id,
          freelancers!freelancer_payments_freelancer_id_fkey(full_name)
        `)
        .eq('event_id', event.id);

      if (freelancerPaymentsError) throw freelancerPaymentsError;

      // Combine the data
      const enhancedEventData = {
        ...eventData,
        payments: paymentsData || [],
        staff_payments: staffPaymentsData || [],
        freelancer_payments: freelancerPaymentsData || []
      };

      setEnhancedEvent(enhancedEventData);
    } catch (error: any) {
      toast({
        title: "Error loading event details",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!enhancedEvent) return;

    try {
      setDownloadingPDF(true);
      await generateIndividualEventReport(enhancedEvent);
      toast({
        title: "PDF Downloaded",
        description: "Event report has been downloaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (!event) return null;

  // Calculate financial summary with ALL costs like PDF report
  const totalAmount = event.total_amount || 0;
  const advanceAmount = event.advance_amount || 0;
  const paymentsArr = Array.isArray(enhancedEvent?.payments) ? enhancedEvent!.payments : [];
  const expensesArr = Array.isArray(enhancedEvent?.expenses) ? enhancedEvent!.expenses : [];
  const closingBalancesArr = Array.isArray(enhancedEvent?.event_closing_balances) ? enhancedEvent!.event_closing_balances : [];
  const tasksArr = Array.isArray(enhancedEvent?.tasks) ? enhancedEvent!.tasks : [];
  const staffPaymentsArr = Array.isArray(enhancedEvent?.staff_payments) ? enhancedEvent!.staff_payments : [];
  const freelancerPaymentsArr = Array.isArray(enhancedEvent?.freelancer_payments) ? enhancedEvent!.freelancer_payments : [];
  const ratesArr = Array.isArray(enhancedEvent?.event_assignment_rates) ? enhancedEvent!.event_assignment_rates : [];

  // Revenue calculation
  const totalPaid = paymentsArr.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const totalCollected = advanceAmount + totalPaid;
  const totalClosed = closingBalancesArr.reduce((sum, closing) => sum + (closing.closing_amount || 0), 0);
  const balanceDue = Math.max(0, totalAmount - totalCollected - totalClosed);

  // Cost calculation (matching PDF report exactly)
  const totalExpenses = expensesArr.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalTaskAmounts = tasksArr.filter(task => task.amount && task.amount > 0).reduce((sum, task) => sum + (task.amount || 0), 0);
  
  // Staff costs from assignment rates (theoretical cost)
  const totalStaffCosts = ratesArr
    .filter(rate => rate.staff_id)
    .reduce((sum, rate) => sum + ((rate.rate || 0) * (rate.quantity || 1)), 0);
  
  // Freelancer costs from assignment rates (theoretical cost)
  const totalFreelancerCosts = ratesArr
    .filter(rate => rate.freelancer_id)
    .reduce((sum, rate) => sum + ((rate.rate || 0) * (rate.quantity || 1)), 0);

  // ACTUAL salary payments made for this event
  const totalStaffPayments = staffPaymentsArr.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const totalFreelancerPayments = freelancerPaymentsArr.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  // Total costs (expenses + task amounts + assignment rates + actual payments + closed amounts)
  const totalCosts = totalExpenses + totalTaskAmounts + totalStaffCosts + totalFreelancerCosts + totalStaffPayments + totalFreelancerPayments + totalClosed;
  
  // Net profit = Revenue - All Costs
  const netProfit = totalAmount - totalCosts;

  // Group staff assignments by Day -> Role -> Members
  const assignmentsArr = Array.isArray(enhancedEvent?.event_staff_assignments)
    ? enhancedEvent!.event_staff_assignments
    : [];

  const staffByDayAndRole = assignmentsArr.reduce((acc, assignment) => {
    const day = Number(assignment.day_number) || 1;
    const role = assignment.role || 'Unassigned';

    const salaryInfo = ratesArr.find(rate =>
      (rate.staff_id && rate.staff_id === assignment.staff_id) ||
      (rate.freelancer_id && rate.freelancer_id === assignment.freelancer_id)
    );

    const staffMember = {
      name: assignment.staff?.full_name || assignment.freelancer?.full_name || 'Unassigned',
      salary: salaryInfo ? (salaryInfo.rate || 0) * (salaryInfo.quantity || 1) : 0,
    };

    if (!acc[day]) acc[day] = {};
    if (!acc[day][role]) acc[day][role] = [] as Array<{ name: string; salary: number }>;
    (acc[day][role] as Array<{ name: string; salary: number }>).push(staffMember);
    return acc;
  }, {} as Record<number, Record<string, Array<{ name: string; salary: number }>>>);

  // Process expenses
  const expenses = expensesArr.map(expense => ({
    ...expense,
    date: expense.expense_date
  }));

  // Process payments
  const payments = paymentsArr.map(payment => ({
    ...payment,
    date: payment.payment_date,
    method: payment.payment_method,
    description: payment.notes || 'Payment'
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px] md:max-w-[600px] max-h-[70vh] md:max-h-[90vh] overflow-y-auto mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-lg font-medium">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground"></div>
              {event.title}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloadingPDF || !enhancedEvent}
              className="gap-2 h-8 text-xs"
            >
              {downloadingPDF ? (
                <>
                  <Loading03Icon className="h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download01Icon className="h-3 w-3" />
                  PDF
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event Basic Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Event Information</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar01Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {formatEventDateRange(event.event_date, (event as any).total_days, (event as any).event_end_date)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Time01Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">{(enhancedEvent || event).event_time || 'Not specified'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Location01Icon className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Venue:</span>
                <span className="font-medium">{event.venue || 'Not specified'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <UserGroupIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{enhancedEvent?.client?.name || 'No client assigned'}</span>
              </div>
              {enhancedEvent?.client?.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Call02Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{enhancedEvent.client.phone}</span>
                </div>
              )}
              {enhancedEvent?.client?.email && (
                <div className="flex items-center gap-2 text-sm">
                  <AiMailIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{enhancedEvent.client.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status:</span>
                <Badge 
                  variant={
                    (enhancedEvent || event).status === 'Confirmed' ? 'default' :
                    (enhancedEvent || event).status === 'Pending' ? 'secondary' :
                    (enhancedEvent || event).status === 'Cancelled' ? 'destructive' : 'outline'
                  }
                  className="text-xs"
                >
                  {(enhancedEvent || event).status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Financial Overview</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-sm font-medium">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Advance</span>
                <span className="text-sm font-medium">₹{advanceAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Total Collected</span>
                <span className="text-sm font-medium">₹{totalCollected.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Event Expenses</span>
                <span className="text-sm font-medium">₹{totalExpenses.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Task Amounts</span>
                <span className="text-sm font-medium">₹{totalTaskAmounts.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Staff Assignment Rates</span>
                <span className="text-sm font-medium">₹{totalStaffCosts.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Freelancer Assignment Rates</span>
                <span className="text-sm font-medium">₹{totalFreelancerCosts.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Staff Payments Made</span>
                <span className="text-sm font-medium">₹{totalStaffPayments.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Freelancer Payments Made</span>
                <span className="text-sm font-medium">₹{totalFreelancerPayments.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Closed Amounts</span>
                <span className="text-sm font-medium">₹{totalClosed.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Balance Due</span>
                <span className="text-sm font-medium">₹{balanceDue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-t pt-2 bg-muted/20 px-2 rounded">
                <span className="text-sm font-semibold">Total Costs</span>
                <span className="text-sm font-semibold text-destructive">₹{totalCosts.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-t pt-2">
                <span className="text-sm font-semibold">Net Profit</span>
                <span className={`text-sm font-semibold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  ₹{Math.abs(netProfit).toLocaleString()} {netProfit < 0 ? '(LOSS)' : netProfit > 0 ? '(PROFIT)' : '(BREAK EVEN)'}
                </span>
              </div>
            </div>
          </div>

          {/* Staff Assignments - Day wise with roles */}
          {Object.keys(staffByDayAndRole).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Staff Assignments</h3>
              <div className="space-y-4">
                {Object.keys(staffByDayAndRole)
                  .sort((a, b) => Number(a) - Number(b))
                  .map((dayKey) => {
                    const day = Number(dayKey);
                    const roles = staffByDayAndRole[day];
                    return (
                      <div key={day} className="border border-border rounded-lg p-3">
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Calendar01Icon className="h-4 w-4 text-primary" />
                          Day {day}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(roles).map(([roleType, members]) => (
                            <div key={roleType} className="bg-muted/30 rounded-md p-2">
                              <div className="text-xs font-medium mb-1">{roleType}</div>
                              <div className="space-y-1">
                                {(members as Array<{ name: string; salary: number }>).map((m, idx) => (
                                  <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <UserCheck01Icon className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-sm">{m.name}</span>
                                    </div>
                                    <div className="text-sm font-medium">₹{m.salary.toLocaleString()}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Expenses */}
          {expenses.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Event Expenses</h3>
              <div className="space-y-2">
                {expenses.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{expense.description}</div>
                      <div className="text-xs text-muted-foreground">{expense.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">₹{expense.amount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{expense.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks with Amounts */}
          {tasksArr.filter(task => task.amount && task.amount > 0).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Task Amounts</h3>
              <div className="space-y-2">
                {tasksArr.filter(task => task.amount && task.amount > 0).map((task, index) => (
                  <div key={task.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{task.title}</div>
                      <div className="text-xs text-muted-foreground">{task.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">₹{task.amount!.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Payments */}
          {staffPaymentsArr.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Staff Payments</h3>
              <div className="space-y-2">
                {staffPaymentsArr.map((payment, index) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{payment.staff?.full_name || 'Unknown Staff'}</div>
                      <div className="text-xs text-muted-foreground">{payment.description || 'Staff Payment'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">₹{payment.amount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{payment.payment_date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Freelancer Payments */}
          {freelancerPaymentsArr.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Freelancer Payments</h3>
              <div className="space-y-2">
                {freelancerPaymentsArr.map((payment, index) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{payment.freelancer?.full_name || 'Unknown Freelancer'}</div>
                      <div className="text-xs text-muted-foreground">{payment.description || 'Freelancer Payment'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">₹{payment.amount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{payment.payment_date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Closed Amounts */}
          {closingBalancesArr.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Closed Amounts</h3>
              <div className="space-y-2">
                {closingBalancesArr.map((closing, index) => (
                  <div key={closing.id} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">Closed Amount</div>
                      <div className="text-xs text-muted-foreground">{closing.closing_reason || 'Reason not specified'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">₹{closing.closing_amount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payments */}
          {payments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Payment History</h3>
              <div className="space-y-2">
                {payments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                    <div>
                      <div className="text-sm font-medium">{payment.description}</div>
                      <div className="text-xs text-muted-foreground">{payment.method}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">₹{payment.amount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{payment.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DetailedEventReportDialog;