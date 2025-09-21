import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

export const useGlobalSalaryStats = () => {
  const { currentFirmId } = useAuth();
  const [staffPayments, setStaffPayments] = useState<any[]>([]);
  const [freelancerPayments, setFreelancerPayments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [assignmentRates, setAssignmentRates] = useState<any[]>([]);
  const [totalStaffCount, setTotalStaffCount] = useState(0);
  const [totalFreelancerCount, setTotalFreelancerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentFirmId) {
      fetchGlobalSalaryData();

      // Set up real-time listeners for all salary-related data
      const staffPaymentsChannel = supabase
        .channel('global-staff-payments-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'staff_payments',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalSalaryData();
        })
        .subscribe();

      const freelancerPaymentsChannel = supabase
        .channel('global-freelancer-payments-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'freelancer_payments',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalSalaryData();
        })
        .subscribe();

      const tasksChannel = supabase
        .channel('global-tasks-salary-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalSalaryData();
        })
        .subscribe();

      const assignmentRatesChannel = supabase
        .channel('global-assignment-rates-stats')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'event_assignment_rates',
          filter: `firm_id=eq.${currentFirmId}`
        }, () => {
          fetchGlobalSalaryData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(staffPaymentsChannel);
        supabase.removeChannel(freelancerPaymentsChannel);
        supabase.removeChannel(tasksChannel);
        supabase.removeChannel(assignmentRatesChannel);
      };
    }
  }, [currentFirmId]);

  const fetchGlobalSalaryData = async () => {
    if (!currentFirmId) return;

    try {
      setLoading(true);

      // Fetch salary-related data for global stats with minimal columns and counts
      const [
        staffPaymentsResult,
        freelancerPaymentsResult,
        tasksResult,
        assignmentRatesResult,
        staffCountResult,
        freelancerCountResult
      ] = await Promise.all([
        supabase.from('staff_payments').select('amount').eq('firm_id', currentFirmId),
        supabase.from('freelancer_payments').select('amount').eq('firm_id', currentFirmId),
        supabase.from('tasks').select('status, amount, assigned_to, freelancer_id').eq('firm_id', currentFirmId),
        supabase.from('event_assignment_rates').select('staff_id, freelancer_id, rate, quantity').eq('firm_id', currentFirmId),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('firm_id', currentFirmId).neq('role', 'Admin'),
        supabase.from('freelancers').select('id', { count: 'exact', head: true }).eq('firm_id', currentFirmId)
      ]);

      if (staffPaymentsResult.error) throw staffPaymentsResult.error;
      if (freelancerPaymentsResult.error) throw freelancerPaymentsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (assignmentRatesResult.error) throw assignmentRatesResult.error;
      if (staffCountResult.error) throw staffCountResult.error;
      if (freelancerCountResult.error) throw freelancerCountResult.error;

      setStaffPayments(staffPaymentsResult.data || []);
      setFreelancerPayments(freelancerPaymentsResult.data || []);
      setTasks(tasksResult.data || []);
      setAssignmentRates(assignmentRatesResult.data || []);
      setTotalStaffCount(staffCountResult.count || 0);
      setTotalFreelancerCount(freelancerCountResult.count || 0);
    } catch (error) {
      console.error('Error fetching global salary stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return { staffPayments, freelancerPayments, tasks, assignmentRates, totalStaffCount, totalFreelancerCount, loading };
};