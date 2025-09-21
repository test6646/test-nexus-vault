import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Freelancer } from '@/types/freelancer';

interface FreelancerSalaryData {
  id: string;
  full_name: string;
  role: string;
  rate?: number;
  phone?: string;
  email?: string;
  total_assignments: number;
  total_tasks: number;
  completed_tasks: number;
  task_earnings: number;
  assignment_earnings: number;
  total_earnings: number;
  paid_amount: number;
  pending_amount: number;
  tasks?: TaskAssignment[];
  eventAssignments?: EventAssignment[];
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
}

interface EventAssignment {
  id: string;
  role: string;
  rate: number;
  quantity: number;
  day_number: number;
  event?: {
    title: string;
    event_type: string;
    client?: {
      name: string;
    };
  };
}

interface FreelancerSalaryStats {
  totalFreelancers: number;
  totalEarnings: number;
  totalPaid: number;
  totalPending: number;
  thisMonthPaid: number;
  avgEarningsPerFreelancer: number;
}

export const useFreelancerSalaryData = () => {
  const { profile, currentFirmId } = useAuth();
  const { toast } = useToast();
  const [freelancerData, setFreelancerData] = useState<FreelancerSalaryData[]>([]);
  const [totalStats, setTotalStats] = useState<FreelancerSalaryStats>({
    totalFreelancers: 0,
    totalEarnings: 0,
    totalPaid: 0,
    totalPending: 0,
    thisMonthPaid: 0,
    avgEarningsPerFreelancer: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadFreelancerSalaryData = async () => {
    if (!currentFirmId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all freelancers for the firm
      const { data: freelancers, error: freelancersError } = await supabase
        .from('freelancers')
        .select('*')
        .eq('firm_id', currentFirmId);

      if (freelancersError) throw freelancersError;

      if (!freelancers || freelancers.length === 0) {
        setFreelancerData([]);
        setTotalStats({
          totalFreelancers: 0,
          totalEarnings: 0,
          totalPaid: 0,
          totalPending: 0,
          thisMonthPaid: 0,
          avgEarningsPerFreelancer: 0,
        });
        setLoading(false);
        return;
      }

      // Get all freelancer payments - separate query without join
      const { data: freelancerPayments, error: paymentsError } = await supabase
        .from('freelancer_payments')
        .select(`
          id,
          freelancer_id, 
          amount, 
          payment_date,
          payment_method,
          description,
          event_id
        `)
        .eq('firm_id', currentFirmId);

      if (paymentsError) throw paymentsError;

      // Get all tasks assigned to freelancers with amounts
      const { data: freelancerTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('freelancer_id, status, amount, title, task_type')
        .eq('firm_id', currentFirmId)
        .not('freelancer_id', 'is', null)
        .not('amount', 'is', null);

      if (tasksError) throw tasksError;

      // Get all event assignment rates for freelancers
      const { data: eventAssignments, error: assignmentsError } = await supabase
        .from('event_assignment_rates')
        .select(`
          freelancer_id, 
          rate, 
          quantity, 
          role, 
          day_number,
          event_id
        `)
        .eq('firm_id', currentFirmId)
        .not('freelancer_id', 'is', null);
      
      // Also get actual event staff assignments for better assignment counting
      const { data: eventStaffAssignments, error: eventStaffAssignmentsError } = await supabase
        .from('event_staff_assignments')
        .select('staff_id, freelancer_id, event_id, role, day_number')
        .eq('firm_id', currentFirmId)
        .not('freelancer_id', 'is', null);

      if (assignmentsError) throw assignmentsError;
      if (eventStaffAssignmentsError) throw eventStaffAssignmentsError;

      // Get event details for payments and assignments
      const allEventIds = [
        ...(eventAssignments?.map(a => a.event_id).filter(Boolean) || []),
        ...(freelancerPayments?.map(p => p.event_id).filter(Boolean) || [])
      ];
      const uniqueEventIds = [...new Set(allEventIds)];
      
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          title,
          event_type,
          client:clients(name)
        `)
        .in('id', uniqueEventIds);

      if (eventsError) throw eventsError;

      // Calculate salary data for each freelancer
      const salaryData: FreelancerSalaryData[] = (freelancers as Freelancer[]).map(freelancer => {
        // Get payments for this freelancer
        const freelancerPaymentRecords = freelancerPayments?.filter(payment => payment.freelancer_id === freelancer.id) || [];
        const paidAmount = freelancerPaymentRecords.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Get tasks assigned to this freelancer
        const assignedTasks = freelancerTasks?.filter(task => task.freelancer_id === freelancer.id) || [];
        
        // Get event assignments for this freelancer (from both tables for accurate counting)
        const freelancerAssignmentRates = eventAssignments?.filter(assignment => assignment.freelancer_id === freelancer.id) || [];
        const freelancerEventAssignments = eventStaffAssignments?.filter(assignment => assignment.freelancer_id === freelancer.id) || [];
        
        // Use event_staff_assignments for counting actual assignments, event_assignment_rates for earnings
        const totalAssignments = freelancerEventAssignments.length;
        
        // Calculate task statistics
        const totalTasks = assignedTasks.length;
        const completedTasks = assignedTasks.filter(task => task.status === 'Completed').length;
        
        // Calculate earnings from tasks (only completed tasks)
        const taskEarnings = assignedTasks
          .filter(task => task.status === 'Completed')
          .reduce((sum, task) => sum + (task.amount || 0), 0);
        
        // Calculate earnings from event assignments (use rates from event_assignment_rates)
        const assignmentEarnings = freelancerAssignmentRates
          .reduce((sum, assignment) => sum + (assignment.rate * assignment.quantity), 0);
        
        const totalEarnings = taskEarnings + assignmentEarnings;
        const pendingAmount = Math.max(0, totalEarnings - paidAmount);

        // Create detailed event breakdown
        const eventBreakdownMap = new Map<string, DetailedEventBreakdown>();
        
        freelancerAssignmentRates.forEach(assignment => {
          const event = events?.find(e => e.id === assignment.event_id);
          if (!event) return;
          
          const eventKey = assignment.event_id || '';
          if (!eventBreakdownMap.has(eventKey)) {
            eventBreakdownMap.set(eventKey, {
              eventId: eventKey,
              eventTitle: event.title || '',
              eventType: event.event_type || '',
              clientName: event.client?.name || 'Unknown Client',
              roles: [],
              totalDays: 0,
              ratePerDay: assignment.rate || 0,
              totalEventPayment: 0,
              workDates: []
            });
          }
          
          const breakdown = eventBreakdownMap.get(eventKey)!;
          if (!breakdown.roles.includes(assignment.role || '')) {
            breakdown.roles.push(assignment.role || '');
          }
          breakdown.totalDays += (assignment.quantity || 0);
          breakdown.totalEventPayment += (assignment.rate || 0) * (assignment.quantity || 0);
        });

        // Create payment history
        const paymentHistory: PaymentRecord[] = freelancerPaymentRecords.map(payment => {
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
          id: freelancer.id,
          full_name: freelancer.full_name,
          role: freelancer.role,
          rate: freelancer.rate || 0,
          phone: freelancer.phone,
          email: freelancer.email,
          total_assignments: totalAssignments,
          total_tasks: totalTasks,
          completed_tasks: completedTasks,
          task_earnings: taskEarnings,
          assignment_earnings: assignmentEarnings,
          total_earnings: totalEarnings,
          paid_amount: paidAmount,
          pending_amount: pendingAmount,
          tasks: assignedTasks.map(task => ({
            id: task.freelancer_id || '',
            title: task.title || '',
            amount: task.amount || 0,
            status: task.status || '',
            task_type: task.task_type || ''
          })),
          eventAssignments: freelancerAssignmentRates.map(assignment => {
            const event = events?.find(e => e.id === assignment.event_id);
            return {
              id: assignment.freelancer_id || '',
              role: assignment.role || '',
              rate: assignment.rate || 0,
              quantity: assignment.quantity || 0,
              day_number: assignment.day_number || 1,
              event: event ? {
                title: event.title || '',
                event_type: event.event_type || '',
                client: event.client
              } : undefined
            };
          }),
          detailedEventBreakdown: Array.from(eventBreakdownMap.values()),
          paymentHistory: paymentHistory
        };
      });

      setFreelancerData(salaryData);

      // Calculate overall statistics
      const totalFreelancers = salaryData.length;
      const totalEarnings = salaryData.reduce((sum, freelancer) => sum + freelancer.total_earnings, 0);
      const totalPaid = salaryData.reduce((sum, freelancer) => sum + freelancer.paid_amount, 0);
      const totalPending = salaryData.reduce((sum, freelancer) => sum + freelancer.pending_amount, 0);

      // Calculate this month's payments
      const thisMonth = new Date();
      const thisMonthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const thisMonthPaid = freelancerPayments?.filter(payment => 
        new Date(payment.payment_date) >= thisMonthStart
      ).reduce((sum, payment) => sum + payment.amount, 0) || 0;

      const avgEarningsPerFreelancer = totalFreelancers > 0 ? totalEarnings / totalFreelancers : 0;

      setTotalStats({
        totalFreelancers,
        totalEarnings,
        totalPaid,
        totalPending,
        thisMonthPaid,
        avgEarningsPerFreelancer,
      });

    } catch (error: any) {
      console.error('Error loading freelancer salary data:', error);
      toast({
        title: "Error loading freelancer salary data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFreelancerSalaryData();
    
    if (!currentFirmId) return;
    
    
    
    // Set up real-time subscriptions for data changes
    const channel = supabase
      .channel(`freelancer-salary-data-${currentFirmId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          // Immediate UI update for optimistic response
          loadFreelancerSalaryData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_assignment_rates',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          // Immediate UI update for rate changes
          loadFreelancerSalaryData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'freelancer_payments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          // Immediate UI update for payment changes
          loadFreelancerSalaryData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'freelancers',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          // Immediate UI update for freelancer changes
          loadFreelancerSalaryData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_staff_assignments',
          filter: `firm_id=eq.${currentFirmId}`
        },
        (payload) => {
          // Immediate UI update for assignment changes
          loadFreelancerSalaryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentFirmId]);

  return {
    freelancerData,
    totalStats,
    loading,
    refetch: loadFreelancerSalaryData,
  };
};