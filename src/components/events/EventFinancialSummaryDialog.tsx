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
  Download01Icon,
  Call02Icon,
  AiMailIcon,
  MoneyBag02Icon,
  DollarCircleIcon,
  Loading03Icon
} from 'hugeicons-react';
import { Event } from '@/types/studio';
import { formatEventDateRange } from '@/lib/date-utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateIndividualEventReport } from './IndividualEventReportPDF';

interface EventFinancialSummaryDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EventFinancialSummaryDialog = ({ event, open, onOpenChange }: EventFinancialSummaryDialogProps) => {
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

      // Fetch detailed event data with all relationships exactly like PDF report
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(name, phone, email),
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
          )
        `)
        .eq('id', event.id)
        .single();

      if (eventError) throw eventError;

      // Fetch crew assignments with staff and freelancer details
      const { data: crewData, error: crewError } = await supabase
        .from('event_staff_assignments')
        .select(`
          *,
          staff:profiles(id, full_name, role),
          freelancer:freelancers(id, full_name, role, phone, email)
        `)
        .eq('event_id', event.id)
        .order('day_number')
        .order('role');

      if (crewError) throw crewError;

      // Fetch tasks for this event with assignee details
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          amount,
          status,
          priority,
          due_date,
          task_type,
          assigned_to,
          freelancer_id,
          assigned_staff:profiles!assigned_to(id, full_name, role),
          assigned_freelancer:freelancers!freelancer_id(id, full_name, role)
        `)
        .eq('event_id', event.id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

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

      // Fetch staff payments for this specific event
      const { data: staffPaymentsData, error: staffPaymentsError } = await supabase
        .from('staff_payments')
        .select(`
          id,
          amount,
          payment_date,
          description,
          staff_id,
          profiles!staff_id(full_name)
        `)
        .eq('event_id', event.id);

      if (staffPaymentsError) throw staffPaymentsError;

      // Fetch freelancer payments for this specific event
      const { data: freelancerPaymentsData, error: freelancerPaymentsError } = await supabase
        .from('freelancer_payments')
        .select(`
          id,
          amount,
          payment_date,
          description,
          freelancer_id,
          freelancers(full_name)
        `)
        .eq('event_id', event.id);

      if (freelancerPaymentsError) throw freelancerPaymentsError;

      // Combine all data exactly like PDF report
      const enhancedEventData = {
        ...eventData,
        payments: paymentsData || [],
        staff_payments: staffPaymentsData || [],
        freelancer_payments: freelancerPaymentsData || [],
        event_staff_assignments: crewData || [],
        tasks: tasksData || []
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

  if (!event || !enhancedEvent) return null;

  // ============= EXACT CALCULATIONS FROM PDF REPORT =============
  const eventRevenue = enhancedEvent.total_amount || 0;
  
  // Cost Breakdown (exactly like PDF)
  const totalExpenses = (enhancedEvent.expenses || []).reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
  const totalTaskAmounts = (enhancedEvent.tasks || []).filter((task: any) => task.amount && task.amount > 0).reduce((sum: number, task: any) => sum + (task.amount || 0), 0);
  
  // Assignment rates (theoretical costs)
  const totalStaffAssignmentRates = (enhancedEvent.event_assignment_rates || [])
    .filter((rate: any) => rate.staff_id)
    .reduce((sum: number, rate: any) => sum + ((rate.rate || 0) * (rate.quantity || 1)), 0);
  const totalFreelancerAssignmentRates = (enhancedEvent.event_assignment_rates || [])
    .filter((rate: any) => rate.freelancer_id)
    .reduce((sum: number, rate: any) => sum + ((rate.rate || 0) * (rate.quantity || 1)), 0);
  
  // Actual payments made
  const totalStaffPaymentsMade = (enhancedEvent.staff_payments || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
  const totalFreelancerPaymentsMade = (enhancedEvent.freelancer_payments || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
  
  const totalClosedAmounts = (() => {
    const closingBalances = enhancedEvent.event_closing_balances;
    if (Array.isArray(closingBalances)) {
      return closingBalances.reduce((sum: number, closing: any) => sum + (closing.closing_amount || 0), 0);
    } else if (closingBalances && typeof closingBalances === 'object' && closingBalances.closing_amount) {
      return closingBalances.closing_amount || 0;
    }
    return 0;
  })();
  
  // Total costs (exactly like PDF calculation)
  const totalCosts = totalExpenses + totalTaskAmounts + totalStaffAssignmentRates + totalFreelancerAssignmentRates + totalClosedAmounts;
  const netProfit = eventRevenue - totalCosts;

  // Payment collection summary
  const advanceAmount = enhancedEvent.advance_amount || 0;
  const totalPayments = (enhancedEvent.payments || []).reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
  const totalCollected = advanceAmount + totalPayments;
  const balanceDue = Math.max(0, eventRevenue - totalCollected - totalClosedAmounts);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Loading03Icon className="h-8 w-8 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading event details...</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[700px] h-[70vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-base sm:text-lg font-semibold">
            <div className="flex items-center gap-2">
              <MoneyBag02Icon className="h-4 w-4 text-primary" />
              <span className="text-sm sm:text-base font-semibold truncate">{enhancedEvent.title}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="gap-1 h-8 text-xs w-full sm:w-auto"
            >
              {downloadingPDF ? (
                <>
                  <Loading03Icon className="h-3 w-3 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download01Icon className="h-3 w-3" />
                  Download PDF
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Event Basic Info */}
          <div className="bg-muted/30 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar01Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              Event Information
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="flex items-start gap-2">
                <Calendar01Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                  <span className="text-muted-foreground flex-shrink-0">Date:</span>
                  <span className="font-medium break-words">
                    {formatEventDateRange(enhancedEvent.event_date, enhancedEvent.total_days, enhancedEvent.event_end_date)}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Location01Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                  <span className="text-muted-foreground flex-shrink-0">Venue:</span>
                  <span className="font-medium break-words">{enhancedEvent.venue || 'Not specified'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <UserGroupIcon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                  <span className="text-muted-foreground flex-shrink-0">Client:</span>
                  <span className="font-medium break-words">{enhancedEvent.client?.name || 'No client'}</span>
                </div>
              </div>
              {enhancedEvent.client?.phone && (
                 <div className="flex items-start gap-2">
                   <Call02Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                   <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                     <span className="text-muted-foreground flex-shrink-0">Phone:</span>
                     <span className="font-medium break-all">{enhancedEvent.client.phone}</span>
                   </div>
                 </div>
               )}
               {enhancedEvent.storage_disk && (
                 <div className="flex items-start gap-2">
                   <MoneyBag02Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                   <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                     <span className="text-muted-foreground flex-shrink-0">Storage Disk:</span>
                     <span className="font-medium break-words">{enhancedEvent.storage_disk}</span>
                   </div>
                 </div>
               )}
                {(enhancedEvent.storage_size && enhancedEvent.storage_size > 0) && (
                  <div className="flex items-start gap-2">
                    <MoneyBag02Icon className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                      <span className="text-muted-foreground flex-shrink-0">Storage Size:</span>
                      <span className="font-medium break-words">
                        {enhancedEvent.storage_size >= 1024 
                          ? `${(enhancedEvent.storage_size / 1024).toFixed(1)} TB`
                          : `${enhancedEvent.storage_size} GB`
                        }
                      </span>
                    </div>
                  </div>
                )}
             </div>
          </div>

          {/* Financial Summary - EXACTLY LIKE PDF */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              Financial Summary (Same as PDF Report)
            </h3>
            
            {/* Revenue Section */}
            <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm sm:text-base font-semibold text-foreground">Event Revenue</h4>
                <span className="text-sm sm:text-lg font-bold text-foreground break-all">₹{eventRevenue.toLocaleString()}</span>
              </div>
            </div>

            {/* Cost Breakdown - Exactly like PDF */}
            <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h4 className="text-sm sm:text-base font-semibold text-destructive">Cost Breakdown</h4>
              
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between py-1 gap-2">
                  <span className="text-muted-foreground flex-1 min-w-0">Expenses (Non-Salary):</span>
                  <span className="font-medium flex-shrink-0">₹{totalExpenses.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-1 gap-2">
                  <span className="text-muted-foreground flex-1 min-w-0">Task Amounts:</span>
                  <span className="font-medium flex-shrink-0">₹{totalTaskAmounts.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-1 gap-2">
                  <span className="text-muted-foreground flex-1 min-w-0">Staff Salary (Assignment Rates):</span>
                  <span className="font-medium flex-shrink-0">₹{totalStaffAssignmentRates.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-1 gap-2">
                  <span className="text-muted-foreground flex-1 min-w-0">Freelancer Payments (Assignment Rates):</span>
                  <span className="font-medium flex-shrink-0">₹{totalFreelancerAssignmentRates.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-1 gap-2">
                  <span className="text-muted-foreground flex-1 min-w-0">Closed Amounts:</span>
                  <span className="font-medium flex-shrink-0">₹{totalClosedAmounts.toLocaleString()}</span>
                </div>
                
                <div className="border-t border-destructive/30 pt-2 mt-2 sm:mt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-destructive flex-1 min-w-0">Total Costs:</span>
                    <span className="font-bold text-destructive flex-shrink-0">₹{totalCosts.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Profit - Exactly like PDF */}
            <div className="border rounded-lg p-3 sm:p-4 bg-muted/10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="text-sm sm:text-lg font-bold text-foreground flex-1 min-w-0">
                  Net Result:
                </h4>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg sm:text-xl font-bold text-foreground break-all">
                    ₹{Math.abs(netProfit).toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {netProfit < 0 ? '(LOSS)' : netProfit > 0 ? '(PROFIT)' : '(BREAK EVEN)'}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs sm:text-sm text-muted-foreground break-words">
                  Calculation: ₹{eventRevenue.toLocaleString()} - ₹{totalCosts.toLocaleString()} = ₹{Math.abs(netProfit).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Collection Status */}
            <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2">
              <h4 className="text-sm sm:text-base font-semibold text-blue-900">Payment Collection Status</h4>
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground flex-1 min-w-0">Advance Received:</span>
                  <span className="font-medium flex-shrink-0">₹{advanceAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground flex-1 min-w-0">Additional Payments:</span>
                  <span className="font-medium flex-shrink-0">₹{totalPayments.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-semibold gap-2">
                  <span className="flex-1 min-w-0">Balance Due:</span>
                  <span className="text-foreground flex-shrink-0">
                    ₹{balanceDue.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Actual Salary Payments Made */}
            {(totalStaffPaymentsMade > 0 || totalFreelancerPaymentsMade > 0) && (
              <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-1.5 sm:space-y-2">
                <h4 className="text-sm sm:text-base font-semibold text-foreground">Actual Salary Payments Made</h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground flex-1 min-w-0">Staff Payments Made:</span>
                    <span className="font-medium text-foreground flex-shrink-0">₹{totalStaffPaymentsMade.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground flex-1 min-w-0">Freelancer Payments Made:</span>
                    <span className="font-medium text-foreground flex-shrink-0">₹{totalFreelancerPaymentsMade.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    * These are additional to the assignment rate costs shown above
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Expenses Breakdown */}
            {enhancedEvent.expenses && enhancedEvent.expenses.length > 0 && (
              <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                <h4 className="text-sm sm:text-base font-semibold text-foreground">Expense Details</h4>
                <div className="space-y-2">
                  {enhancedEvent.expenses.map((expense: any, index: number) => (
                    <div key={expense.id || index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-2 border-b border-border/50 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm font-medium break-words">{expense.description}</div>
                        <div className="text-xs text-muted-foreground break-words">
                          {new Date(expense.expense_date).toLocaleDateString()} • {expense.category} • {expense.payment_method}
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-foreground flex-shrink-0">₹{expense.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Crew Assignments Section */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <UserGroupIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              Crew Assignments & Stats
            </h3>

            {enhancedEvent.event_staff_assignments && enhancedEvent.event_staff_assignments.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {/* Group assignments by role and day */}
                {Object.entries(
                  enhancedEvent.event_staff_assignments.reduce((acc: any, a: any) => {
                    const day = a.day_number || 1;
                    if (!acc[day]) acc[day] = {};
                    const role = a.role || 'Unassigned';
                    if (!acc[day][role]) acc[day][role] = [];
                    acc[day][role].push(a);
                    return acc;
                  }, {})
                ).sort(([a]: any, [b]: any) => Number(a) - Number(b)).map(([day, roles]: [string, any]) => (
                  <div key={day} className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2 sm:mb-3">Day {String(day).padStart(2, '0')}</h4>
                    {Object.entries(roles).map(([role, assignments]: [string, any]) => (
                      <div key={role} className="mb-1.5 sm:mb-2">
                        <span className="text-xs sm:text-sm font-medium text-muted-foreground">{role}: </span>
                        {assignments.map((assignment: any, idx: number) => (
                          <span key={assignment.id} className="text-xs sm:text-sm text-foreground break-words">
                            {assignment.staff?.full_name || assignment.freelancer?.full_name || 'Unassigned'}
                            {assignment.staff_type === 'freelancer' && ' (Freelancer)'}
                            {idx < assignments.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
                <div className="bg-muted/30 rounded p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    <strong>Total Assignments:</strong> {enhancedEvent.event_staff_assignments.length} | 
                    <strong> Staff:</strong> {enhancedEvent.event_staff_assignments.filter((a: any) => a.staff_id).length} | 
                    <strong> Freelancers:</strong> {enhancedEvent.event_staff_assignments.filter((a: any) => a.freelancer_id).length}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-muted/20 border border-dashed rounded-lg p-3 sm:p-4 text-center text-muted-foreground">
                <span className="text-xs sm:text-sm">No crew assignments found for this event</span>
              </div>
            )}
          </div>

          {/* Tasks Section */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar01Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              Event Tasks
            </h3>

            {enhancedEvent.tasks && enhancedEvent.tasks.length > 0 ? (
              <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                <div className="space-y-2">
                  {enhancedEvent.tasks.map((task: any, index: number) => (
                    <div key={task.id || index} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 py-2 border-b border-green-100 last:border-b-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <div className="text-xs sm:text-sm font-medium break-words">{task.title}</div>
                          <div className="flex items-center gap-1">
                            <Badge variant={task.status === 'Completed' ? 'default' : 'secondary'} className="text-xs">
                              {task.status}
                            </Badge>
                            {task.priority && (
                              <Badge variant="outline" className="text-xs">
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground break-words">
                          Assigned to: {task.assigned_staff?.full_name || task.assigned_freelancer?.full_name || 'Unassigned'}
                        </div>
                      </div>
                      {task.amount && task.amount > 0 && (
                        <span className="text-xs sm:text-sm font-semibold text-foreground flex-shrink-0">₹{task.amount.toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-muted/20 border border-dashed rounded-lg p-3 sm:p-4 text-center text-muted-foreground">
                <span className="text-xs sm:text-sm">No tasks found for this event</span>
              </div>
            )}
          </div>

          {/* Payment History Section */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
              <MoneyBag02Icon className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              Payment History
            </h3>

            <div className="space-y-2 sm:space-y-3">
              {/* Advance Payment */}
              {advanceAmount > 0 && (
                <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Advance Payment</h4>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground break-words">
                        Method: {enhancedEvent.advance_payment_method || 'Not specified'}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-foreground flex-shrink-0">₹{advanceAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Additional Payments */}
              {enhancedEvent.payments && enhancedEvent.payments.length > 0 && (
                <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2 sm:mb-3">Additional Payments</h4>
                  <div className="space-y-2">
                    {enhancedEvent.payments.map((payment: any, index: number) => (
                      <div key={payment.id || index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-2 border-b border-border/50 last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground break-words">
                            {payment.payment_method} 
                            {payment.reference_number && ` • Ref: ${payment.reference_number}`}
                            {payment.invoice_id && ` • Invoice: ${payment.invoice_id}`}
                          </div>
                          {payment.notes && <div className="text-xs text-muted-foreground mt-1 break-words">{payment.notes}</div>}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-foreground flex-shrink-0">₹{payment.amount?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-muted/20 border border-border rounded-lg p-3 sm:p-4">
                <h4 className="text-sm font-semibold text-foreground mb-2 sm:mb-3">Payment Summary</h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="flex-1 min-w-0">Total Event Amount:</span>
                    <span className="font-medium flex-shrink-0">₹{eventRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="flex-1 min-w-0">Total Collected:</span>
                    <span className="font-medium flex-shrink-0">₹{totalCollected.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="flex-1 min-w-0">Closed/Written Off:</span>
                    <span className="font-medium flex-shrink-0">₹{totalClosedAmounts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-semibold gap-2">
                    <span className="flex-1 min-w-0">Balance Due:</span>
                    <span className="text-foreground flex-shrink-0">₹{balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventFinancialSummaryDialog;
