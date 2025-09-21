import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getDateRangeForFinance } from '@/lib/date-utils';
import { useAccountingEntries } from '@/hooks/useAccountingEntries';

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
  const { entries: accountingEntries, refetch: refetchAccountingEntries } = useAccountingEntries();

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
        // Using custom date range
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        // Ensure end date includes the full day
        endDate.setHours(23, 59, 59, 999);
      } else {
        const { startDate: calculatedStart, endDate: calculatedEnd, isGlobal: calculatedGlobal } = getDateRangeForFinance(timeRange);
        startDate = calculatedStart;
        endDate = calculatedEnd;
        isGlobal = calculatedGlobal;
      }

      // 🔥 CRITICAL FIX: First refetch accounting entries and wait for completion
      await refetchAccountingEntries();
      
      // Wait a brief moment for state to update
      await new Promise(resolve => setTimeout(resolve, 50));

      // Filter accounting entries that reflect to company and match date range
      const companyAccountingEntries = accountingEntries?.filter(entry => {
        if (!entry.reflect_to_company) return false;
        
        if (isGlobal) return true;
        
        const entryDate = new Date(entry.entry_date);
        return entryDate >= startDate && entryDate <= endDate;
      }) || [];


      // Calculate accounting credits and debits
      const accountingCredits = companyAccountingEntries
        .filter(entry => entry.entry_type === 'Credit')
        .reduce((sum, entry) => sum + entry.amount, 0);
      
      const accountingDebits = companyAccountingEntries
        .filter(entry => entry.entry_type === 'Debit')
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Fetch events with conditional query for global/custom view
      let eventsQuery = supabase
        .from('events')
        .select('id, total_amount, advance_amount, balance_amount, photo_editing_status, video_editing_status, event_date, advance_payment_method')
        .eq('firm_id', currentFirmId);

      if (!isGlobal) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        // Applying date filter to events
        eventsQuery = eventsQuery
          .gte('event_date', startDateStr)
          .lte('event_date', endDateStr);
      }

      const { data: events, error: eventsError } = await eventsQuery;
      if (eventsError) throw eventsError;

      // Fetch payments with date filtering
      let paymentsQuery = supabase
        .from('payments')
        .select('amount, payment_date, event_id, payment_method')
        .eq('firm_id', currentFirmId);

      if (!isGlobal) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        paymentsQuery = paymentsQuery
          .gte('payment_date', startDateStr)
          .lte('payment_date', endDateStr);
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      // Fetch freelancer payments with date filtering
      let freelancerPaymentsQuery = supabase
        .from('freelancer_payments')
        .select('amount, payment_date, payment_method')
        .eq('firm_id', currentFirmId);

      if (!isGlobal) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        freelancerPaymentsQuery = freelancerPaymentsQuery
          .gte('payment_date', startDateStr)
          .lte('payment_date', endDateStr);
      }

      const { data: freelancerPayments, error: freelancerPaymentsError } = await freelancerPaymentsQuery;
      if (freelancerPaymentsError) throw freelancerPaymentsError;

      // Fetch staff payments with date filtering  
      let staffPaymentsQuery = supabase
        .from('staff_payments')
        .select('amount, payment_date, payment_method')
        .eq('firm_id', currentFirmId);

      if (!isGlobal) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        staffPaymentsQuery = staffPaymentsQuery
          .gte('payment_date', startDateStr)
          .lte('payment_date', endDateStr);
      }

      const { data: staffPayments, error: staffPaymentsError } = await staffPaymentsQuery;
      if (staffPaymentsError) throw staffPaymentsError;

      // Fetch expenses with date filtering
      let expensesQuery = supabase
        .from('expenses')
        .select('amount, expense_date, category, payment_method')
        .eq('firm_id', currentFirmId);

      if (!isGlobal) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        expensesQuery = expensesQuery
          .gte('expense_date', startDateStr)
          .lte('expense_date', endDateStr);
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
      
      // PAYMENT IN = ALL collected payments (payments table + ALL advance amounts + accounting credits)
      // Calculate total from payments table
      const totalPaymentsFromTable = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      
      // Add ALL advance amounts (since advance is a type of collection)
      const totalAdvanceAmounts = events?.reduce((sum, event) => {
        return sum + (event.advance_amount || 0);
      }, 0) || 0;
      
      // Add accounting credits that reflect to company
      const paymentIn = totalPaymentsFromTable + totalAdvanceAmounts + accountingCredits;
      
      // PENDING AMOUNT = Total Revenue - Total Payments In - Total Closed Amount
      const totalClosedAmount = closingBalances?.reduce((sum, closing) => sum + (closing.closing_amount || 0), 0) || 0;
      const pendingAmount = Math.max(0, totalRevenue - paymentIn - totalClosedAmount);
      
      // ==================================================================================
      // 🔥 CRITICAL: PAYMENT OUT CALCULATION LOGIC - DO NOT CHANGE WITHOUT UNDERSTANDING
      // ==================================================================================
      // PAYMENT OUT = EXPENSES ONLY
      // 
      // Staff salaries and freelancer payments should be recorded as EXPENSES in the 
      // expenses table, NOT double-counted. This maintains clean database hierarchy.
      // 
      // If salary is paid, it should go into expenses table with appropriate category.
      // Do NOT add staff_payments and freelancer_payments to paymentOut as this would
      // double-count the same money flow.
      // ==================================================================================
      const totalExpensesAmount = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const totalStaffPayments = staffPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const totalFreelancerPayments = freelancerPayments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      
      // 🔥 PAYMENT OUT = EXPENSES + accounting debits that reflect to company
      const paymentOut = totalExpensesAmount + accountingDebits;
      
      // Total expenses for display includes all types for completeness
      const totalExpenses = totalExpensesAmount + totalStaffPayments + totalFreelancerPayments + accountingDebits;
      
      // NET PROFIT = Payment In - Total Expenses (consistent with calculations)
      const netProfit = paymentIn - totalExpenses;
      
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
      
      // Add ALL advance payments from events (since advance is payment collected)
      events?.forEach(event => {
        if (event.advance_amount > 0) {
          if (event.advance_payment_method === 'Cash') {
            cashPaymentsIn += event.advance_amount;
          } else {
            digitalPaymentsIn += event.advance_amount;
          }
        }
      });

      // 🔥 PAYMENT OUT BREAKDOWN = EXPENSES + accounting debits that reflect to company
      expenses?.forEach(expense => {
        if (expense.payment_method === 'Cash') {
          cashPaymentsOut += expense.amount;
        } else {
          digitalPaymentsOut += expense.amount;
        }
      });

      // Add accounting debits to payment out breakdown using payment method if available
      companyAccountingEntries?.forEach(entry => {
        if (entry.entry_type === 'Debit') {
          if (entry.payment_method === 'Digital') {
            digitalPaymentsOut += entry.amount;
          } else {
            cashPaymentsOut += entry.amount; // Default to cash if not specified
          }
        }
      });

      // Add accounting credits to payment in breakdown using payment method if available
      companyAccountingEntries?.forEach(entry => {
        if (entry.entry_type === 'Credit') {
          if (entry.payment_method === 'Digital') {
            digitalPaymentsIn += entry.amount;
          } else {
            cashPaymentsIn += entry.amount; // Default to cash if not specified
          }
        }
      });

      // 🔥 DO NOT ADD SALARY PAYMENTS TO PAYMENT OUT BREAKDOWN
      // Staff and freelancer payments are tracked separately for reporting but
      // should be recorded as expenses to avoid double counting in financial calculations
      
      const paymentMethodStats = [
        { method: 'Cash', amount: cashPaymentsIn, outAmount: cashPaymentsOut },
        { method: 'Digital', amount: digitalPaymentsIn, outAmount: digitalPaymentsOut }
      ];

      // Calculate REAL time-based stats with ACTUAL MONEY RECEIVED
      let monthlyStats: any[] = [];
      
      if (timeRange === 'week') {
        // Current week: Sunday to Saturday breakdown - ALWAYS show all 7 days
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        monthlyStats = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(startOfWeek);
          date.setDate(startOfWeek.getDate() + i);
          
          // Filter PAYMENT IN data for this specific day (only from payments table)
          const dayPaymentIn = payments?.filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate.toDateString() === date.toDateString();
          }).reduce((sum, payment) => sum + payment.amount, 0) || 0;
          
          // Add advance amounts for events on this day
          const dayAdvanceAmounts = events?.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate.toDateString() === date.toDateString();
          }).reduce((sum, event) => sum + (event.advance_amount || 0), 0) || 0;
          
           const dayTotalExpenses = expenses?.filter(expense => {
             const expenseDate = new Date(expense.expense_date);
             return expenseDate.toDateString() === date.toDateString();
           }).reduce((sum, expense) => sum + expense.amount, 0) || 0;
           
           return {
              month: dayNames[i], // Use consistent day names
              revenue: dayPaymentIn + dayAdvanceAmounts,
              expenses: dayTotalExpenses
            };
        });
      } else if (timeRange === 'month') {
        // Current month: Show all 4 weeks - ALWAYS show all 4 weeks
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        monthlyStats = Array.from({ length: 4 }, (_, i) => {
          const weekStart = new Date(startOfMonth);
          weekStart.setDate(startOfMonth.getDate() + (i * 7));
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          
          // Ensure we don't go beyond the month
          if (weekEnd > endOfMonth) {
            weekEnd.setTime(endOfMonth.getTime());
          }
          
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
           
           return {
             month: `Week ${i + 1}`, // Simple week numbering
             revenue: weekPaymentIn + weekAdditionalPayments,
             expenses: weekTotalExpenses
           };
        });
      } else if (timeRange === 'quarter') {
        // Quarter breakdown: ALWAYS show all 3 months of current quarter
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Get current quarter start month
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const quarterStartMonth = currentQuarter * 3;
        
        monthlyStats = Array.from({ length: 3 }, (_, i) => {
          const monthIndex = quarterStartMonth + i;
          const monthStart = new Date(now.getFullYear(), monthIndex, 1);
          const monthEnd = new Date(now.getFullYear(), monthIndex + 1, 0);
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
             month: monthNames[monthIndex], // Use actual month name
             revenue: monthPaymentIn + monthAdditionalPayments,
             expenses: monthTotalExpenses
           };
        });
      } else if (timeRange === 'year') {
        // Year breakdown: ALWAYS show all 12 months
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        monthlyStats = Array.from({ length: 12 }, (_, i) => {
          const monthStart = new Date(now.getFullYear(), i, 1);
          const monthEnd = new Date(now.getFullYear(), i + 1, 0);
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
             month: monthNames[i],
             revenue: monthPaymentIn + monthAdditionalPayments,
             expenses: monthTotalExpenses
           };
        });
      } else {
        // All time view: Show yearly data for all years that have data
        const allEventYears = new Set<number>();
        const allPaymentYears = new Set<number>();
        const allExpenseYears = new Set<number>();
        
        // Collect all years from events
        events?.forEach(event => {
          allEventYears.add(new Date(event.event_date).getFullYear());
        });
        
        // Collect all years from payments
        payments?.forEach(payment => {
          allPaymentYears.add(new Date(payment.payment_date).getFullYear());
        });
        
        // Collect all years from expenses
        expenses?.forEach(expense => {
          allExpenseYears.add(new Date(expense.expense_date).getFullYear());
        });
        
        // Combine all unique years and sort
        const allYears = Array.from(new Set([...allEventYears, ...allPaymentYears, ...allExpenseYears])).sort();
        
        // If no data years found, show current year and previous 2 years
        const years = allYears.length > 0 ? allYears : (() => {
          const currentYear = new Date().getFullYear();
          return [currentYear - 2, currentYear - 1, currentYear];
        })();
        
        monthlyStats = years.map((year) => {
          const yearStart = new Date(year, 0, 1);
          const yearEnd = new Date(year, 11, 31);
          yearEnd.setHours(23, 59, 59, 999);
          
          // Filter PAYMENT IN data for this year (actual money received)
          const yearPaymentIn = events?.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate >= yearStart && eventDate <= yearEnd;
          }).reduce((sum, event) => sum + (event.advance_amount || 0), 0) || 0;
          
          const yearAdditionalPayments = payments?.filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate >= yearStart && paymentDate <= yearEnd;
          }).reduce((sum, payment) => sum + payment.amount, 0) || 0;
          
           const yearTotalExpenses = expenses?.filter(expense => {
             const expenseDate = new Date(expense.expense_date);
             return expenseDate >= yearStart && expenseDate <= yearEnd;
           }).reduce((sum, expense) => sum + expense.amount, 0) || 0;
           
           return {
             month: year.toString(),
             revenue: yearPaymentIn + yearAdditionalPayments,
             expenses: yearTotalExpenses
           };
        });
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

// ========================================
// CRITICAL FINANCIAL CALCULATION SUMMARY:
// ========================================
// PAYMENT IN = Collections table + Event advance amounts + Accounting Credits (reflect_to_company = true)
// PAYMENT OUT = Expenses + Accounting Debits (reflect_to_company = true)  
// NET PROFIT = Payment In - Total Expenses (includes salary + accounting debits)
// REVENUE = Event total amounts
// PENDING = Revenue - Payment In - Closed amounts
//
// Accounting entries with reflect_to_company = true are included in financial calculations
// This allows for proper business accounting integration while maintaining data integrity
// ========================================