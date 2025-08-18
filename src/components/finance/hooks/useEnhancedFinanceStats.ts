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
  expensesByCategory?: any[];
  paymentMethodStats?: any[];
  monthlyStats?: any[];
}

export const useEnhancedFinanceStats = (
  timeRange: string, 
  customStartDate?: string, 
  customEndDate?: string
) => {
  const { profile, currentFirmId } = useAuth();
  const [stats, setStats] = useState<EnhancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadFinancialStats = async () => {
    if (!currentFirmId) {
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
        const { startDate: calculatedStart, endDate: calculatedEnd, isGlobal: calculatedGlobal } = getDateRangeForFinance(timeRange);
        startDate = calculatedStart;
        endDate = calculatedEnd;
        isGlobal = calculatedGlobal;
      }

      // Fetch events with conditional query for global/custom view
      let eventsQuery = supabase
        .from('events')
        .select('id, total_amount, advance_amount, balance_amount, photo_editing_status, video_editing_status, event_date, advance_payment_method')
        .eq('firm_id', currentFirmId);

      if (!isGlobal) {
        if (timeRange === 'custom') {
          eventsQuery = eventsQuery
            .gte('event_date', startDate.toISOString().split('T')[0])
            .lte('event_date', endDate.toISOString().split('T')[0]);
        } else {
          eventsQuery = eventsQuery.gte('event_date', startDate.toISOString().split('T')[0]);
        }
      }

      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      // Fetch payments with date filtering
      let paymentsQuery = supabase
        .from('payments')
        .select('amount, payment_date, event_id, payment_method')
        .eq('firm_id', currentFirmId);

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

      // Fetch freelancer payments with date filtering
      let freelancerPaymentsQuery = supabase
        .from('freelancer_payments')
        .select('amount, payment_date, payment_method')
        .eq('firm_id', currentFirmId);

      if (!isGlobal) {
        if (timeRange === 'custom') {
          freelancerPaymentsQuery = freelancerPaymentsQuery
            .gte('payment_date', startDate.toISOString().split('T')[0])
            .lte('payment_date', endDate.toISOString().split('T')[0]);
        } else {
          freelancerPaymentsQuery = freelancerPaymentsQuery.gte('payment_date', startDate.toISOString().split('T')[0]);
        }
      }

      const { data: freelancerPayments, error: freelancerPaymentsError } = await freelancerPaymentsQuery;
      if (freelancerPaymentsError) throw freelancerPaymentsError;

      // Fetch staff payments with date filtering  
      let staffPaymentsQuery = supabase
        .from('staff_payments')
        .select('amount, payment_date, payment_method')
        .eq('firm_id', currentFirmId);

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
        .select('amount, expense_date, category, payment_method')
        .eq('firm_id', currentFirmId);

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

      // Fetch closing balances for all events
      const { data: closingBalances, error: closingBalancesError } = await supabase
        .from('event_closing_balances')
        .select('closing_amount, event_id')
        .eq('firm_id', currentFirmId);

      if (closingBalancesError) throw closingBalancesError;

      // Fetch tasks for overall counts (not date filtered)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status, due_date')
        .eq('firm_id', currentFirmId);

      if (tasksError) throw tasksError;

      // Calculate comprehensive stats using ALL real data
      const totalEvents = events?.length || 0;
      const completedEvents = events?.filter(event => 
        event.photo_editing_status === true && event.video_editing_status === true
      ).length || 0;
      const pendingEvents = totalEvents - completedEvents;
      
      // Total Revenue from all events
      const totalRevenue = events?.reduce((sum, event) => sum + (event.total_amount || 0), 0) || 0;
      
      // PAYMENT IN = ALL collected payments (from payments table + advance amounts that are NOT in payments table)
      // Calculate total from payments table first
      const totalPaymentsFromTable = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      
      // Add advance amounts ONLY for events that don't have payments in the payments table
      const advanceNotInPayments = events?.reduce((sum, event) => {
        const hasPaymentsInTable = payments?.some(p => p.event_id === event.id);
        if (!hasPaymentsInTable && event.advance_amount > 0) {
          return sum + event.advance_amount;
        }
        return sum;
      }, 0) || 0;
      
      const paymentIn = totalPaymentsFromTable + advanceNotInPayments;
      
      // PENDING AMOUNT = Total event balance amounts MINUS closed amounts
      const totalClosedAmount = closingBalances?.reduce((sum, closing) => sum + (closing.closing_amount || 0), 0) || 0;
      const pendingAmount = (events?.reduce((sum, event) => sum + (event.balance_amount || 0), 0) || 0) - totalClosedAmount;
      
      // PAYMENT OUT = Total expenses ONLY (assuming salary is already in expenses)
      // If salary is NOT in expenses, then we need to add staff/freelancer payments
      // Check if expenses include salary categories to avoid double counting
      const totalExpensesAmount = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const totalStaffPayments = staffPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const totalFreelancerPayments = freelancerPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      
      // For now, assume salary payments are separate from expenses
      // This gives user flexibility to track them separately
      const paymentOut = totalExpensesAmount + totalStaffPayments + totalFreelancerPayments;
      
      // Total expenses for display
      const totalExpenses = totalExpensesAmount;
      
      // NET PROFIT = Payment In - Payment Out
      const netProfit = paymentIn - paymentOut;
      
      const pendingTasks = tasks?.filter(task => task.status === 'Waiting for Response').length || 0;

      // Add detailed breakdown data for charts
      const expensesByCategory = expenses?.reduce((acc: any[], expense) => {
        const existingCategory = acc.find(item => item.category === expense.category);
        if (existingCategory) {
          existingCategory.amount += expense.amount;
        } else {
          acc.push({ category: expense.category, amount: expense.amount });
        }
        return acc;
      }, []) || [];

      // PAYMENT METHOD STATS - For incoming payments breakdown  
      let cashPaymentsIn = 0;
      let digitalPaymentsIn = 0;
      let cashPaymentsOut = 0;
      let digitalPaymentsOut = 0;
      
      // Get payment method breakdown from payments table and event advance payments (PAYMENT IN)
      payments?.forEach(payment => {
        if (payment.payment_method === 'Cash') {
          cashPaymentsIn += payment.amount;
        } else {
          digitalPaymentsIn += payment.amount;
        }
      });
      
      // Add advance payments from events (for events with no payments table entries)
      events?.forEach(event => {
        // Only count advance if there are no payments for this event
        const hasPayments = payments?.some(p => p.event_id === event.id);
        if (!hasPayments && event.advance_amount > 0) {
          if (event.advance_payment_method === 'Cash') {
            cashPaymentsIn += event.advance_amount;
          } else {
            digitalPaymentsIn += event.advance_amount;
          }
        }
      });

      // ✅ FIX: Get payment method breakdown for PAYMENT OUT without double counting
      expenses?.forEach(expense => {
        if (expense.payment_method === 'Cash') {
          cashPaymentsOut += expense.amount;
        } else {
          digitalPaymentsOut += expense.amount;
        }
      });

      // Add salary payments to Payment Out breakdown
      staffPayments?.forEach(payment => {
        if (payment.payment_method === 'Cash') {
          cashPaymentsOut += payment.amount;
        } else {
          digitalPaymentsOut += payment.amount;
        }
      });

      freelancerPayments?.forEach(payment => {
        if (payment.payment_method === 'Cash') {
          cashPaymentsOut += payment.amount;
        } else {
          digitalPaymentsOut += payment.amount;
        }
      });
      
      const paymentMethodStats = [
        { method: 'Cash', amount: cashPaymentsIn, outAmount: cashPaymentsOut },
        { method: 'Digital', amount: digitalPaymentsIn, outAmount: digitalPaymentsOut }
      ];

      // Calculate REAL time-based stats with ACTUAL MONEY RECEIVED
      let monthlyStats: any[] = [];
      
      if (timeRange === 'week') {
        // Current week: Sunday to Saturday breakdown
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        
        monthlyStats = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          
          // Filter PAYMENT IN data for this specific day (only from payments table)
          const dayPaymentIn = payments?.filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate.toDateString() === date.toDateString();
          }).reduce((sum, payment) => sum + payment.amount, 0) || 0;
          
           const dayTotalExpenses = expenses?.filter(expense => {
             const expenseDate = new Date(expense.expense_date);
             return expenseDate.toDateString() === date.toDateString();
           }).reduce((sum, expense) => sum + expense.amount, 0) || 0;
           
           return {
              month: date.toLocaleDateString('en-US', { weekday: 'short' }),
              revenue: dayPaymentIn,
              expenses: dayTotalExpenses
            };
        });
      } else if (timeRange === 'month') {
        // Current month: Daily breakdown for last 30 days
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        monthlyStats = Array.from({ length: 4 }, (_, i) => {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - ((3 - i + 1) * 7));
          weekStart.setHours(0, 0, 0, 0);
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          weekEnd.setHours(23, 59, 59, 999);
          
          // Filter PAYMENT IN data for this week (actual money received)
          const weekPaymentIn = events?.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate >= weekStart && eventDate <= weekEnd;
          }).reduce((sum, event) => sum + (event.advance_amount || 0), 0) || 0;
          
          const weekAdditionalPayments = payments?.filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate >= weekStart && paymentDate <= weekEnd;
          }).reduce((sum, payment) => sum + payment.amount, 0) || 0;
          
           const weekTotalExpenses = expenses?.filter(expense => {
             const expenseDate = new Date(expense.expense_date);
             return expenseDate >= weekStart && expenseDate <= weekEnd;
           }).reduce((sum, expense) => sum + expense.amount, 0) || 0;
           
           const weekStartFormatted = `${weekStart.getDate()} ${monthNames[weekStart.getMonth()]}`;
           const weekEndFormatted = `${weekEnd.getDate()} ${monthNames[weekEnd.getMonth()]}`;
           
           return {
             month: `${weekStartFormatted} - ${weekEndFormatted}`,
             revenue: weekPaymentIn + weekAdditionalPayments,
             expenses: weekTotalExpenses
           };
        });
      } else if (timeRange === 'quarter') {
        // Quarter breakdown: Last 3 months only
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        monthlyStats = Array.from({ length: 3 }, (_, i) => {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
          monthEnd.setHours(23, 59, 59, 999);
          
          // Filter PAYMENT IN data for this month (actual money received)
          const monthPaymentIn = events?.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate >= monthStart && eventDate <= monthEnd;
          }).reduce((sum, event) => sum + (event.advance_amount || 0), 0) || 0;
          
          const monthAdditionalPayments = payments?.filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate >= monthStart && paymentDate <= monthEnd;
          }).reduce((sum, payment) => sum + payment.amount, 0) || 0;
          
           const monthTotalExpenses = expenses?.filter(expense => {
             const expenseDate = new Date(expense.expense_date);
             return expenseDate >= monthStart && expenseDate <= monthEnd;
           }).reduce((sum, expense) => sum + expense.amount, 0) || 0;
           
           return {
             month: monthNames[monthDate.getMonth()],
             revenue: monthPaymentIn + monthAdditionalPayments,
             expenses: monthTotalExpenses
           };
        });
      } else if (timeRange === 'year') {
        // Year breakdown: Jan to current month
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        monthlyStats = Array.from({ length: currentMonth + 1 }, (_, i) => {
          const monthStart = new Date(currentYear, i, 1);
          const monthEnd = new Date(currentYear, i + 1, 0);
          
          // Filter PAYMENT IN data for this month (actual money received)
          const monthPaymentIn = events?.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate >= monthStart && eventDate <= monthEnd;
          }).reduce((sum, event) => sum + (event.advance_amount || 0), 0) || 0;
          
          const monthAdditionalPayments = payments?.filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate >= monthStart && paymentDate <= monthEnd;
          }).reduce((sum, payment) => sum + payment.amount, 0) || 0;
          
           const monthTotalExpenses = expenses?.filter(expense => {
             const expenseDate = new Date(expense.expense_date);
             return expenseDate >= monthStart && expenseDate <= monthEnd;
           }).reduce((sum, expense) => sum + expense.amount, 0) || 0;
           
           return {
             month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
             revenue: monthPaymentIn + monthAdditionalPayments,
             expenses: monthTotalExpenses
           };
        });
      } else {
        // For global/custom: Last 6 months breakdown
        monthlyStats = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          // Filter PAYMENT IN data for this month (actual money received)
          const monthPaymentIn = events?.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate >= monthStart && eventDate <= monthEnd;
          }).reduce((sum, event) => sum + (event.advance_amount || 0), 0) || 0;
          
          const monthAdditionalPayments = payments?.filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate >= monthStart && paymentDate <= monthEnd;
          }).reduce((sum, payment) => sum + payment.amount, 0) || 0;
          
           const monthTotalExpenses = expenses?.filter(expense => {
             const expenseDate = new Date(expense.expense_date);
             return expenseDate >= monthStart && expenseDate <= monthEnd;
           }).reduce((sum, expense) => sum + expense.amount, 0) || 0;
           
           return {
             month: date.toLocaleDateString('en-US', { month: 'short' }),
             revenue: monthPaymentIn + monthAdditionalPayments,
             expenses: monthTotalExpenses
           };
        }).reverse();
      }

      setStats({
        totalEvents,
        totalRevenue,
        pendingAmount,
        totalExpenses,
        activeEvents: pendingEvents,
        pendingTasks,
        completedEvents,
        monthlyRevenue: paymentIn,
        monthlyExpenses: paymentOut,
        paymentIn,
        paymentOut,
        netProfit,
        expensesByCategory,
        paymentMethodStats,
        monthlyStats
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
    if (currentFirmId) {
      loadFinancialStats();
    } else {
      setLoading(false);
    }
  }, [currentFirmId, timeRange, customStartDate, customEndDate]);

  return {
    stats,
    loading,
    loadFinancialStats
  };
};