import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getDateRangeForFinance } from '@/lib/date-utils';

interface EnhancedStats {
  totalEvents: number;
  paymentIn: number;
  paymentOut: number;
  netProfit: number;
  totalRevenue: number;
  totalExpenses: number;
  pendingAmount: number;
  activeEvents: number;
  completedEvents: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  pendingTasks: number;
}

export const useEnhancedFinanceStats = (
  timeRange: string, 
  customStartDate?: string, 
  customEndDate?: string
) => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<EnhancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadFinancialStats = async () => {
    if (!profile?.current_firm_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get date range based on selection
      let startDate: Date;
      let endDate: Date = new Date();
      let isGlobal = false;

      if (timeRange === 'custom' && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        const { startDate: calculatedStart, isGlobal: calculatedGlobal } = getDateRangeForFinance(timeRange);
        startDate = calculatedStart;
        isGlobal = calculatedGlobal;
      }

      // Fetch events with conditional query for global/custom view
      let eventsQuery = supabase
        .from('events')
        .select('total_amount, advance_amount, balance_amount, photo_editing_status, video_editing_status, created_at')
        .eq('firm_id', profile.current_firm_id);

      if (!isGlobal) {
        if (timeRange === 'custom') {
          eventsQuery = eventsQuery
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());
        } else {
          eventsQuery = eventsQuery.gte('created_at', startDate.toISOString());
        }
      }

      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      // Fetch payments with date filtering
      let paymentsQuery = supabase
        .from('payments')
        .select('amount, payment_date')
        .eq('firm_id', profile.current_firm_id);

      if (!isGlobal) {
        if (timeRange === 'custom') {
          paymentsQuery = paymentsQuery
            .gte('payment_date', startDate.toISOString().split('T')[0])
            .lte('payment_date', endDate.toISOString().split('T')[0]);
        } else {
          paymentsQuery = paymentsQuery.gte('payment_date', startDate.toISOString().split('T')[0]);
        }
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      // Fetch staff payments with date filtering
      let staffPaymentsQuery = supabase
        .from('staff_payments')
        .select('amount, payment_date')
        .eq('firm_id', profile.current_firm_id);

      if (!isGlobal) {
        if (timeRange === 'custom') {
          staffPaymentsQuery = staffPaymentsQuery
            .gte('payment_date', startDate.toISOString().split('T')[0])
            .lte('payment_date', endDate.toISOString().split('T')[0]);
        } else {
          staffPaymentsQuery = staffPaymentsQuery.gte('payment_date', startDate.toISOString().split('T')[0]);
        }
      }

      const { data: staffPayments, error: staffPaymentsError } = await staffPaymentsQuery;
      if (staffPaymentsError) throw staffPaymentsError;

      // Fetch expenses with date filtering
      let expensesQuery = supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('firm_id', profile.current_firm_id);

      if (!isGlobal) {
        if (timeRange === 'custom') {
          expensesQuery = expensesQuery
            .gte('expense_date', startDate.toISOString().split('T')[0])
            .lte('expense_date', endDate.toISOString().split('T')[0]);
        } else {
          expensesQuery = expensesQuery.gte('expense_date', startDate.toISOString().split('T')[0]);
        }
      }

      const { data: expenses, error: expensesError } = await expensesQuery;
      if (expensesError) throw expensesError;

      // Fetch tasks for overall counts (not date filtered)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status, due_date')
        .eq('firm_id', profile.current_firm_id);

      if (tasksError) throw tasksError;

      // Calculate comprehensive stats using ALL real data
      const totalEvents = events?.length || 0;
      const completedEvents = events?.filter(event => 
        event.photo_editing_status === true && event.video_editing_status === true
      ).length || 0;
      const pendingEvents = totalEvents - completedEvents;
      
      const totalRevenue = events?.reduce((sum, event) => sum + (event.total_amount || 0), 0) || 0;
      
      // Payment In = Direct payments from payments table + Advance amounts from events
      const directPayments = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const eventAdvances = events?.reduce((sum, event) => sum + (event.advance_amount || 0), 0) || 0;
      const paymentIn = directPayments + eventAdvances;
      
      const paymentOut = staffPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const totalExpenses = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const pendingAmount = events?.reduce((sum, event) => sum + (event.balance_amount || 0), 0) || 0;
      const netProfit = paymentIn - paymentOut - totalExpenses;
      const pendingTasks = tasks?.filter(task => task.status === 'Pending').length || 0;

      setStats({
        totalEvents,
        totalRevenue,
        pendingAmount,
        totalExpenses,
        activeEvents: pendingEvents,
        pendingTasks,
        completedEvents,
        monthlyRevenue: paymentIn,
        monthlyExpenses: totalExpenses,
        paymentIn,
        paymentOut,
        netProfit
      });

    } catch (error: any) {
      toast({
        title: "Error loading financial data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.current_firm_id) {
      loadFinancialStats();
    } else {
      setLoading(false);
    }
  }, [profile?.current_firm_id, timeRange, customStartDate, customEndDate]);

  return {
    stats,
    loading,
    loadFinancialStats
  };
};