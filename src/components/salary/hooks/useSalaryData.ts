import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StaffSalaryData {
  id: string;
  full_name: string;
  mobile_number: string;
  role: string;
  telegram_chat_id?: string;
  total_assignments: number;
  total_tasks: number;
  completed_tasks: number;
  task_earnings: number;
  assignment_earnings: number;
  total_earnings: number;
  paid_amount: number;
  pending_amount: number;
  tasks?: TaskAssignment[];
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
  totalEarnings: number;
  totalPaid: number;
  totalPending: number;
  thisMonthPaid: number;
  avgEarningsPerStaff: number;
}

export const useSalaryData = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [staffData, setStaffData] = useState<StaffSalaryData[]>([]);
  const [totalStats, setTotalStats] = useState<SalaryStats>({
    totalStaff: 0,
    totalEarnings: 0,
    totalPaid: 0,
    totalPending: 0,
    thisMonthPaid: 0,
    avgEarningsPerStaff: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadSalaryData = async () => {
    if (!profile?.current_firm_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all staff members for the firm
      const { data: staffMembers, error: staffError } = await supabase
        .from('profiles')
        .select('id, full_name, mobile_number, role, telegram_chat_id')
        .eq('firm_id', profile.current_firm_id)
        .neq('role', 'Admin');

      if (staffError) throw staffError;

      if (!staffMembers || staffMembers.length === 0) {
        setStaffData([]);
        setTotalStats({
          totalStaff: 0,
          totalEarnings: 0,
          totalPaid: 0,
          totalPending: 0,
          thisMonthPaid: 0,
          avgEarningsPerStaff: 0,
        });
        setLoading(false);
        return;
      }

      // Get all tasks with amounts for staff members
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          assigned_to, 
          status, 
          amount, 
          event_id,
          title,
          task_type,
          event:events(id, title, client:clients(name))
        `)
        .eq('firm_id', profile.current_firm_id)
        .not('assigned_to', 'is', null)
        .not('amount', 'is', null);

      if (tasksError) throw tasksError;

      // Get all staff payments
      const { data: staffPayments, error: paymentsError } = await supabase
        .from('staff_payments')
        .select('staff_id, amount, payment_date')
        .eq('firm_id', profile.current_firm_id);

      if (paymentsError) throw paymentsError;

      // Get all event assignment rates for staff
      const { data: eventAssignments, error: assignmentsError } = await supabase
        .from('event_assignment_rates')
        .select('staff_id, rate, quantity, role, day_number, event_id')
        .eq('firm_id', profile.current_firm_id)
        .not('staff_id', 'is', null);

      if (assignmentsError) throw assignmentsError;

      // Calculate salary data for each staff member
      const salaryData: StaffSalaryData[] = staffMembers.map(staff => {
        // Get tasks assigned to this staff member
        const staffTasks = tasks?.filter(task => task.assigned_to === staff.id) || [];
        
        // Get event assignments for this staff member
        const staffAssignments = eventAssignments?.filter(assignment => assignment.staff_id === staff.id) || [];
        
        // Calculate task statistics
        const totalTasks = staffTasks.length;
        const completedTasks = staffTasks.filter(task => task.status === 'Completed').length;
        
        // Calculate earnings from tasks (only completed tasks)
        const taskEarnings = staffTasks
          .filter(task => task.status === 'Completed')
          .reduce((sum, task) => sum + (task.amount || 0), 0);
        
        // Calculate earnings from event assignments
        const assignmentEarnings = staffAssignments
          .reduce((sum, assignment) => sum + (assignment.rate * assignment.quantity), 0);
        
        const totalEarnings = taskEarnings + assignmentEarnings;

        // Calculate payments received
        const staffPaymentRecords = staffPayments?.filter(payment => payment.staff_id === staff.id) || [];
        const paidAmount = staffPaymentRecords.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Calculate pending amount based on total earnings
        const pendingAmount = Math.max(0, totalEarnings - paidAmount);

        return {
          id: staff.id,
          full_name: staff.full_name,
          mobile_number: staff.mobile_number,
          role: staff.role,
          telegram_chat_id: staff.telegram_chat_id,
          total_assignments: staffAssignments.length,
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
            amount: task.amount || 0,
            status: task.status || '',
            task_type: task.task_type || '',
            event: task.event
          }))
        };
      });

      setStaffData(salaryData);

      // Calculate overall statistics
      const totalStaff = salaryData.length;
      const totalTaskEarnings = salaryData.reduce((sum, staff) => sum + staff.task_earnings, 0);
      const totalAssignmentEarnings = salaryData.reduce((sum, staff) => sum + staff.assignment_earnings, 0);
      const totalEarnings = totalTaskEarnings + totalAssignmentEarnings;
      const totalPaid = salaryData.reduce((sum, staff) => sum + staff.paid_amount, 0);
      const totalPending = salaryData.reduce((sum, staff) => sum + staff.pending_amount, 0);

      // Calculate this month's payments
      const thisMonth = new Date();
      const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const thisMonthPaid = staffPayments?.filter(payment => 
        new Date(payment.payment_date) >= thisMonthStart
      ).reduce((sum, payment) => sum + payment.amount, 0) || 0;

      const avgEarningsPerStaff = totalStaff > 0 ? totalEarnings / totalStaff : 0;

      setTotalStats({
        totalStaff,
        totalEarnings,
        totalPaid,
        totalPending,
        thisMonthPaid,
        avgEarningsPerStaff,
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
          filter: `firm_id=eq.${profile?.current_firm_id}`
        },
        () => {
          console.log('Task updated, refreshing salary data...');
          loadSalaryData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_payments',
          filter: `firm_id=eq.${profile?.current_firm_id}`
        },
        () => {
          console.log('Staff payment updated, refreshing salary data...');
          loadSalaryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.current_firm_id]);

  return {
    staffData,
    totalStats,
    loading,
    refetch: loadSalaryData,
  };
};