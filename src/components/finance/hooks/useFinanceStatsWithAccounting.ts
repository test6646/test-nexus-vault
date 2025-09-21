import { useState, useEffect, useMemo } from 'react';
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

export const useFinanceStatsWithAccounting = (
  timeRange: string, 
  customStartDate?: string, 
  customEndDate?: string
) => {
  const { profile, currentFirmId } = useAuth();
  const [stats, setStats] = useState<EnhancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { entries: accountingEntries, loading: accountingLoading } = useAccountingEntries();

  // 🔥 CRITICAL: Calculate filtered accounting entries with memoization
  const filteredAccountingEntries = useMemo(() => {
    if (!accountingEntries || accountingEntries.length === 0) return [];
    
    let startDate: Date;
    let endDate: Date = new Date();
    let isGlobal = false;

    if (timeRange === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const { startDate: calculatedStart, endDate: calculatedEnd, isGlobal: calculatedGlobal } = getDateRangeForFinance(timeRange);
      startDate = calculatedStart;
      endDate = calculatedEnd;
      isGlobal = calculatedGlobal;
    }

    const companyEntries = accountingEntries.filter(entry => {
      if (!entry.reflect_to_company) return false;
      
      if (isGlobal) return true;
      
      const entryDate = new Date(entry.entry_date);
      return entryDate >= startDate && entryDate <= endDate;
    });


    return companyEntries;
  }, [accountingEntries, timeRange, customStartDate, customEndDate]);

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
        endDate.setHours(23, 59, 59, 999);
      } else {
        const { startDate: calculatedStart, endDate: calculatedEnd, isGlobal: calculatedGlobal } = getDateRangeForFinance(timeRange);
        startDate = calculatedStart;
        endDate = calculatedEnd;
        isGlobal = calculatedGlobal;
      }

      // Use the memoized filtered entries
      const companyAccountingEntries = filteredAccountingEntries;

      // Calculate accounting credits and debits
      const accountingCredits = companyAccountingEntries
        .filter(entry => entry.entry_type === 'Credit')
        .reduce((sum, entry) => sum + entry.amount, 0);
      
      const accountingDebits = companyAccountingEntries
        .filter(entry => entry.entry_type === 'Debit')
        .reduce((sum, entry) => sum + entry.amount, 0);


      // Fetch all other data with proper date filtering
      let eventsQuery = supabase
        .from('events')
        .select('id, total_amount, advance_amount, balance_amount, photo_editing_status, video_editing_status, event_date, advance_payment_method')
        .eq('firm_id', currentFirmId);

      if (!isGlobal) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
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

      // Fetch closing balances
      const { data: closingBalances, error: closingBalancesError } = await supabase
        .from('event_closing_balances')
        .select('closing_amount, event_id')
        .eq('firm_id', currentFirmId);

      if (closingBalancesError) throw closingBalancesError;

      // Calculate stats with accounting entries properly included
      const totalEvents = events?.length || 0;
      const completedEvents = events?.filter(event => 
        event.photo_editing_status === true && event.video_editing_status === true
      ).length || 0;
      
      const totalRevenue = events?.reduce((sum, event) => sum + (event.total_amount || 0), 0) || 0;
      
      // PAYMENT IN = payments + advance amounts + accounting credits
      const totalPaymentsFromTable = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
      const totalAdvanceAmounts = events?.reduce((sum, event) => sum + (event.advance_amount || 0), 0) || 0;
      const paymentIn = totalPaymentsFromTable + totalAdvanceAmounts + accountingCredits;
      
      // PAYMENT OUT = expenses + accounting debits
      const totalExpensesAmount = expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
      const paymentOut = totalExpensesAmount + accountingDebits;
      
      const totalClosedAmount = closingBalances?.reduce((sum, closing) => sum + (closing.closing_amount || 0), 0) || 0;
      const pendingAmount = Math.max(0, totalRevenue - paymentIn - totalClosedAmount);
      
      const totalExpenses = totalExpensesAmount + accountingDebits;
      const netProfit = paymentIn - totalExpenses;


      // Create expense categories including accounting - use generic type
      const expenseItems: Array<{ category: string; amount: number }> = [];
      
      // Add regular expenses
      expenses?.forEach(expense => {
        expenseItems.push({
          category: expense.category,
          amount: expense.amount
        });
      });
      
      // Add accounting debits to expense categories
      companyAccountingEntries.forEach(entry => {
        if (entry.entry_type === 'Debit') {
          expenseItems.push({
            category: entry.category || 'Accounting',
            amount: entry.amount
          });
        }
      });

      const groupedExpenses = expenseItems.reduce((acc: any[], expense) => {
        const existingCategory = acc.find(item => item.category === expense.category);
        if (existingCategory) {
          existingCategory.amount += expense.amount;
        } else {
          acc.push({ category: expense.category, amount: expense.amount });
        }
        return acc;
      }, []);

      // Payment method stats including accounting entries
      let cashPaymentsIn = 0;
      let digitalPaymentsIn = 0;
      
      // From payments table
      payments?.forEach(payment => {
        if (payment.payment_method === 'Cash') {
          cashPaymentsIn += payment.amount;
        } else {
          digitalPaymentsIn += payment.amount;
        }
      });
      
      // From advance payments
      events?.forEach(event => {
        if (event.advance_amount > 0) {
          if (event.advance_payment_method === 'Cash') {
            cashPaymentsIn += event.advance_amount;
          } else {
            digitalPaymentsIn += event.advance_amount;
          }
        }
      });

      // From accounting credits - payment_method EXISTS in DB!
      companyAccountingEntries?.forEach(entry => {
        if (entry.entry_type === 'Credit') {
          if (entry.payment_method === 'Digital') {
            digitalPaymentsIn += entry.amount;
          } else {
            cashPaymentsIn += entry.amount;
          }
        }
      });

      const paymentMethodStats = [
        { method: 'Cash', amount: cashPaymentsIn },
        { method: 'Digital', amount: digitalPaymentsIn }
      ];

      // 🔥 CRITICAL: Generate complete time period stats for charts
      const generateCompleteTimeStats = () => {
        const statsMap = new Map();
        
        // Generate all time periods based on range
        const generateTimePeriods = () => {
          const periods = [];
          
          switch (timeRange) {
            case 'week': {
              // Generate all 7 days of the week
              const weekStart = new Date(startDate);
              for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(weekStart.getDate() + i);
                const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
                periods.push({ key: dayKey, date: new Date(date) });
              }
              break;
            }
            case 'month': {
              // Generate all 4 weeks of the month
              const monthStart = new Date(startDate);
              for (let week = 1; week <= 4; week++) {
                periods.push({ key: `Week ${week}`, date: new Date(monthStart.getFullYear(), monthStart.getMonth(), (week - 1) * 7 + 1) });
              }
              break;
            }
            case 'quarter': {
              // Generate all 3 months of the quarter
              const quarterStart = new Date(startDate);
              for (let i = 0; i < 3; i++) {
                const date = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + i, 1);
                const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
                periods.push({ key: monthKey, date });
              }
              break;
            }
            case 'year': {
              // Generate all 12 months of the year
              const yearStart = new Date(startDate);
              for (let i = 0; i < 12; i++) {
                const date = new Date(yearStart.getFullYear(), i, 1);
                const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
                periods.push({ key: monthKey, date });
              }
              break;
            }
            case 'global': {
              // Generate all years with data, or current + previous 2 years
              const currentYear = new Date().getFullYear();
              const allYears = new Set();
              
              // Add years from events
              events?.forEach(event => {
                allYears.add(new Date(event.event_date).getFullYear());
              });
              
              // Add years from expenses
              expenses?.forEach(expense => {
                allYears.add(new Date(expense.expense_date).getFullYear());
              });
              
              // Add years from accounting entries
              companyAccountingEntries?.forEach(entry => {
                allYears.add(new Date(entry.entry_date).getFullYear());
              });
              
              // If no data, show current + previous 2 years
              if (allYears.size === 0) {
                allYears.add(currentYear);
                allYears.add(currentYear - 1);
                allYears.add(currentYear - 2);
              }
              
              Array.from(allYears).sort((a, b) => (a as number) - (b as number)).forEach(year => {
                periods.push({ key: year.toString(), date: new Date(year as number, 0, 1) });
              });
              break;
            }
            default: {
              // Default to month view
              const monthStart = new Date(startDate);
              for (let week = 1; week <= 4; week++) {
                periods.push({ key: `Week ${week}`, date: new Date(monthStart.getFullYear(), monthStart.getMonth(), (week - 1) * 7 + 1) });
              }
            }
          }
          
          return periods;
        };
        
        // Initialize all periods with zero values
        const allPeriods = generateTimePeriods();
        allPeriods.forEach(period => {
          statsMap.set(period.key, { 
            month: period.key, 
            revenue: 0, 
            expenses: 0,
            date: period.date 
          });
        });
        
        // Helper function to get the appropriate key for different time ranges
        const getTimeKey = (date: Date) => {
          switch (timeRange) {
            case 'week':
              return date.toLocaleDateString('en-US', { weekday: 'short' });
            case 'month': {
              const monthStart = new Date(startDate);
              const dayOfMonth = date.getDate();
              const weekNumber = Math.ceil(dayOfMonth / 7);
              return `Week ${weekNumber}`;
            }
            case 'quarter':
              return date.toLocaleDateString('en-US', { month: 'short' });
            case 'year':
              return date.toLocaleDateString('en-US', { month: 'short' });
            case 'global':
              return date.getFullYear().toString();
            default:
              return date.toLocaleDateString('en-US', { month: 'short' });
          }
        };
        
        // Process events
        events?.forEach(event => {
          const eventDate = new Date(event.event_date);
          const timeKey = getTimeKey(eventDate);
          if (statsMap.has(timeKey)) {
            statsMap.get(timeKey).revenue += event.total_amount || 0;
          }
        });

        // Process expenses
        expenses?.forEach(expense => {
          const expenseDate = new Date(expense.expense_date);
          const timeKey = getTimeKey(expenseDate);
          if (statsMap.has(timeKey)) {
            statsMap.get(timeKey).expenses += expense.amount || 0;
          }
        });

        // Process accounting entries
        companyAccountingEntries?.forEach(entry => {
          const entryDate = new Date(entry.entry_date);
          const timeKey = getTimeKey(entryDate);
          if (statsMap.has(timeKey)) {
            if (entry.entry_type === 'Credit') {
              statsMap.get(timeKey).revenue += entry.amount || 0;
            } else {
              statsMap.get(timeKey).expenses += entry.amount || 0;
            }
          }
        });

        return Array.from(statsMap.values()).sort((a, b) => {
          if (timeRange === 'global') {
            return parseInt(a.month) - parseInt(b.month);
          }
          if (a.date && b.date) {
            return a.date.getTime() - b.date.getTime();
          }
          return 0;
        });
      };

      const monthlyStats = generateCompleteTimeStats();

      setStats({
        totalEvents,
        paymentIn,
        paymentOut,
        netProfit,
        totalRevenue,
        totalExpenses,
        pendingAmount,
        activeEvents: totalEvents - completedEvents,
        completedEvents,
        monthlyRevenue: paymentIn,
        monthlyExpenses: totalExpenses,
        pendingTasks: 0,
        expensesByCategory: groupedExpenses,
        paymentMethodStats,
        monthlyStats
      });

    } catch (error) {
      console.error('Error loading financial stats:', error);
      toast({
        title: "Error",
        description: "Failed to load financial statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accountingLoading && accountingEntries) {
      loadFinancialStats();
    }
  }, [currentFirmId, timeRange, customStartDate, customEndDate, accountingEntries, accountingLoading]);

  return {
    stats,
    loading: loading || accountingLoading,
  };
};