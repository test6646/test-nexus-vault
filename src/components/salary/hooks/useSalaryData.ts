import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StaffSalaryData {
  id: string;
  full_name: string;
  mobile_number: string;
  role: string;
  total_assignments: number;
  total_tasks: number;
  completed_tasks: number;
  task_earnings: number;
  assignment_earnings: number;
  total_earnings: number;
  paid_amount: number;
  pending_amount: number;
  tasks?: TaskAssignment[];
  detailedEventBreakdown?: DetailedEventBreakdown[];
  paymentHistory?: PaymentRecord[];
}

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

interface TaskAssignment {
  id: string;
  title: string;
  amount: number;
  status: string;
  task_type: string;
  event?: {
    id: string;
    title: string;
    client?: {
      name: string;
    };
  };
}

interface SalaryStats {
  totalStaff: number;
  totalFreelancers: number;
  taskPaymentsTotal: number;
  assignmentRatesTotal: number;
  totalPaid: number;
  totalPending: number;
  avgPerPerson: number;
  totalEarnings: number;
}

export const useSalaryData = () => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const [staffData, setStaffData] = useState<StaffSalaryData[]>([]);
  const [totalStats, setTotalStats] = useState<SalaryStats>({
    totalStaff: 0,
    totalFreelancers: 0,
    taskPaymentsTotal: 0,
    assignmentRatesTotal: 0,
    totalPaid: 0,
    totalPending: 0,
    avgPerPerson: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadSalaryData = async () => {
    if (!currentFirmId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // 🚀 OPTIMIZED: Parallel data fetching instead of sequential
      const [
        { data: staffMembers, error: staffError },
        { data: freelancers, error: freelancersError },
        { data: tasks, error: tasksError },
        { data: freelancerTasks, error: freelancerTasksError },
        { data: staffPayments, error: paymentsError },
        { data: freelancerPayments, error: freelancerPaymentsError },
        { data: eventAssignments, error: assignmentsError },
        { data: eventStaffAssignments, error: eventStaffAssignmentsError },
        { data: events, error: eventsError }
      ] = await Promise.all([
        // Get all staff members for the firm
        supabase
          .from('profiles')
          .select('id, full_name, mobile_number, role')
          .eq('firm_id', currentFirmId)
          .neq('role', 'Admin'),
        
        // Get all freelancers for the firm
        supabase
          .from('freelancers')
          .select('id, full_name, role')
          .eq('firm_id', currentFirmId),
        
        // Get all tasks assigned to staff with amounts
        supabase
          .from('tasks')
          .select(`
            id,
            assigned_to, 
            freelancer_id,
            status, 
            amount, 
            event_id,
            title,
            task_type,
            event:events(id, title, client:clients(name))
          `)
          .eq('firm_id', currentFirmId)
          .not('assigned_to', 'is', null)
          .not('amount', 'is', null),
        
        // Get all tasks assigned to freelancers with amounts
        supabase
          .from('tasks')
          .select('id, freelancer_id, status, amount, title, task_type')
          .eq('firm_id', currentFirmId)
          .not('freelancer_id', 'is', null)
          .not('amount', 'is', null),
        
        // Get all staff payments with additional fields needed
        supabase
          .from('staff_payments')
          .select('id, staff_id, amount, payment_date, payment_method, description, event_id')
          .eq('firm_id', currentFirmId),
        
        // Get all freelancer payments
        supabase
          .from('freelancer_payments')
          .select('freelancer_id, amount, payment_date')
          .eq('firm_id', currentFirmId),
        
        // Get all event assignment rates for staff and freelancers
        supabase
          .from('event_assignment_rates')
          .select('staff_id, freelancer_id, rate, quantity, role, day_number, event_id')
          .eq('firm_id', currentFirmId),
        
        // Also get actual event staff assignments for better assignment counting
        supabase
          .from('event_staff_assignments')
          .select('staff_id, freelancer_id, event_id, role, day_number')
          .eq('firm_id', currentFirmId),
        
        // Get events with client details for detailed reporting
        supabase
          .from('events')
          .select('id, title, event_type, client:clients(name)')
          .eq('firm_id', currentFirmId)
      ]);

      // Check for errors
      if (staffError) throw staffError;
      if (freelancersError) throw freelancersError;
      if (tasksError) throw tasksError;
      if (freelancerTasksError) throw freelancerTasksError;
      if (paymentsError) throw paymentsError;
      if (freelancerPaymentsError) throw freelancerPaymentsError;
      if (assignmentsError) throw assignmentsError;
      if (eventStaffAssignmentsError) throw eventStaffAssignmentsError;
      if (eventsError) throw eventsError;

      if ((!staffMembers || staffMembers.length === 0) && (!freelancers || freelancers.length === 0)) {
        setStaffData([]);
        setTotalStats({
          totalStaff: 0,
          totalFreelancers: 0,
          taskPaymentsTotal: 0,
          assignmentRatesTotal: 0,
          totalPaid: 0,
          totalPending: 0,
          avgPerPerson: 0,
          totalEarnings: 0,
        });
        setLoading(false);
        return;
      }

      const salaryData: StaffSalaryData[] = (staffMembers || []).map(staff => {
        // Get tasks assigned to this staff member
        const staffTasks = tasks?.filter(task => task.assigned_to === staff.id) || [];
        
        // Get event assignments for this staff member (from both tables for accurate counting)
        const staffAssignmentRates = eventAssignments?.filter(assignment => assignment.staff_id === staff.id) || [];
        const staffEventAssignments = eventStaffAssignments?.filter(assignment => assignment.staff_id === staff.id) || [];
        
        // Use event_staff_assignments for counting actual assignments, event_assignment_rates for earnings
        const totalAssignments = staffEventAssignments.length;
        
        
        // Calculate task statistics
        const totalTasks = staffTasks.length;
        const completedTasks = staffTasks.filter(task => task.status === 'Completed').length;
        
        // Calculate earnings from tasks (ALL tasks for total earnings, completed for display)
        const taskEarnings = staffTasks
          .filter(task => task.status === 'Completed')
          .reduce((sum, task) => sum + (Number(task.amount) || 0), 0);
        
        // Calculate ALL potential task earnings (for pending calculation)
        const allTaskEarnings = staffTasks
          .reduce((sum, task) => sum + (Number(task.amount) || 0), 0);
        
        // Calculate earnings from event assignments (use rates from event_assignment_rates)
        const assignmentEarnings = staffAssignmentRates
          .reduce((sum, assignment) => {
            const rate = Number(assignment.rate) || 0;
            const quantity = Number(assignment.quantity) || 0;
            const earnings = rate * quantity;
            return sum + earnings;
          }, 0);
        
        
        const totalEarnings = allTaskEarnings + assignmentEarnings;

        // Calculate payments received
        const staffPaymentRecords = staffPayments?.filter(payment => payment.staff_id === staff.id) || [];
        const paidAmount = staffPaymentRecords.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
        
        // Calculate pending amount based on total earnings
        const pendingAmount = Math.max(0, totalEarnings - paidAmount);

        // Create detailed event breakdown for staff (same as freelancer approach)
        const eventBreakdownMap = new Map<string, any>();
        staffAssignmentRates.forEach(assignment => {
          const event = events?.find(e => e.id === assignment.event_id);
          if (!event) return;

          const key = event.id;
          if (!eventBreakdownMap.has(key)) {
            eventBreakdownMap.set(key, {
              eventId: event.id,
              eventTitle: event.title || '',
              eventType: event.event_type || '',
              clientName: event.client?.name || 'Unknown Client',
              roles: [],
              totalDays: 0,
              ratePerDay: 0,
              totalEventPayment: 0
            });
          }

          const breakdown = eventBreakdownMap.get(key);
          if (assignment.role && !breakdown.roles.includes(assignment.role)) {
            breakdown.roles.push(assignment.role);
          }
          breakdown.totalDays += (assignment.quantity || 0);
          breakdown.totalEventPayment += (assignment.rate || 0) * (assignment.quantity || 0);
        });

        // Create payment history for staff
        const paymentHistory = staffPaymentRecords.map(payment => {
          const relatedEvent = events?.find(e => e.id === payment.event_id);
          
          return {
            id: payment.id || '',
            amount: payment.amount || 0,
            paymentDate: payment.payment_date || '',
            paymentMethod: payment.payment_method || '',
            description: payment.description || '',
            eventId: payment.event_id || undefined,
            eventTitle: relatedEvent?.title || undefined
          };
        });

        return {
          id: staff.id,
          full_name: staff.full_name,
          mobile_number: staff.mobile_number,
          role: staff.role,
          total_assignments: totalAssignments,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          task_earnings: taskEarnings,
          assignment_earnings: assignmentEarnings,
          total_earnings: totalEarnings,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
          tasks: staffTasks.map(task => ({
            id: task.id || '',
            title: task.title || '',
            amount: Number(task.amount) || 0,
            status: task.status || '',
            task_type: task.task_type || '',
            event: task.event
          })),
          detailedEventBreakdown: Array.from(eventBreakdownMap.values()),
          paymentHistory: paymentHistory
        };
      });

      setStaffData(salaryData);

      // 🚀 FIXED: Staff-only stats calculation (freelancers are handled separately)
      const totalStaff = staffMembers?.length || 0;
      
      // Calculate staff-only earnings and stats
      const staffTotalEarnings = salaryData.reduce((sum, staff) => sum + staff.total_earnings, 0);
      const staffTaskEarnings = salaryData.reduce((sum, staff) => sum + staff.task_earnings, 0);
      const staffAssignmentEarnings = salaryData.reduce((sum, staff) => sum + staff.assignment_earnings, 0);
      const staffTotalPaid = salaryData.reduce((sum, staff) => sum + staff.paid_amount, 0);
      const staffTotalPending = Math.max(0, staffTotalEarnings - staffTotalPaid);

      const avgPerPerson = totalStaff > 0 ? staffTotalEarnings / totalStaff : 0;

      setTotalStats({
        totalStaff,
        totalFreelancers: 0, // Staff view only shows staff
        taskPaymentsTotal: staffTaskEarnings,
        assignmentRatesTotal: staffAssignmentEarnings,
        totalPaid: staffTotalPaid,
        totalPending: staffTotalPending,
        avgPerPerson,
        totalEarnings: staffTotalEarnings,
      });

    } catch (error: any) {
      console.error('Error loading salary data:', error);
      toast({
        title: "Error loading salary data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalaryData();
    
    // Set up real-time subscription for tasks updates
    const channel = supabase
      .channel('salary-data-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `firm_id=eq.${currentFirmId}`
        },
        () => {
          loadSalaryData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_payments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        () => {
          loadSalaryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentFirmId]);

  return {
    staffData,
    totalStats,
    loading,
    refetch: loadSalaryData,
  };
};