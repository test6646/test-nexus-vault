import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useState, useEffect } from 'react';
import StatCard from '@/components/ui/stat-card';
import { 
  DollarCircleIcon, 
  MoneyReceive01Icon, 
  MoneyBag02Icon, 
  AnalyticsUpIcon,
  Calendar01Icon,
  Tick02Icon,
  ChartHistogramIcon,
  CreditCardIcon
} from 'hugeicons-react';

interface FinanceStatsProps {
  stats: {
    totalEvents: number;
    totalRevenue: number;
    pendingAmount: number;
    totalExpenses: number;
    activeEvents: number;
    completedEvents: number;
    monthlyRevenue: number;
    paymentIn: number;
    paymentOut: number;
    netProfit: number;
  };
  timeRange?: string;
  customStartDate?: string;
  customEndDate?: string;
}

const FinanceStats = ({ stats, timeRange = 'month', customStartDate, customEndDate }: FinanceStatsProps) => {
  const { profile, currentFirmId } = useAuth();
  const [paymentBreakdowns, setPaymentBreakdowns] = useState<any>({});

  useEffect(() => {
    if (currentFirmId) {
      fetchPaymentBreakdowns();
    }
  }, [currentFirmId, timeRange, customStartDate, customEndDate]);

  const fetchPaymentBreakdowns = async () => {
    if (!currentFirmId) return;

    try {
      // Apply date filtering to queries based on timeRange
      const { getDateRangeForFinance } = await import('@/lib/date-utils');
      
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

      let paymentsQuery = supabase.from('payments').select('amount, payment_method, payment_date').eq('firm_id', currentFirmId);
      let expensesQuery = supabase.from('expenses').select('amount, payment_method, expense_date').eq('firm_id', currentFirmId);
      let staffQuery = supabase.from('staff_payments').select('amount, payment_method, payment_date').eq('firm_id', currentFirmId);
      let freelancerQuery = supabase.from('freelancer_payments').select('amount, payment_method, payment_date').eq('firm_id', currentFirmId);
      let eventsQuery = supabase.from('events').select('advance_amount, advance_payment_method, event_date').eq('firm_id', currentFirmId);

      // Apply date filters if not global
      if (!isGlobal) {
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        if (timeRange === 'custom') {
          paymentsQuery = paymentsQuery.gte('payment_date', startDateStr).lte('payment_date', endDateStr);
          expensesQuery = expensesQuery.gte('expense_date', startDateStr).lte('expense_date', endDateStr);
          staffQuery = staffQuery.gte('payment_date', startDateStr).lte('payment_date', endDateStr);
          freelancerQuery = freelancerQuery.gte('payment_date', startDateStr).lte('payment_date', endDateStr);
          eventsQuery = eventsQuery.gte('event_date', startDateStr).lte('event_date', endDateStr);
        } else {
          paymentsQuery = paymentsQuery.gte('payment_date', startDateStr);
          expensesQuery = expensesQuery.gte('expense_date', startDateStr);
          staffQuery = staffQuery.gte('payment_date', startDateStr);
          freelancerQuery = freelancerQuery.gte('payment_date', startDateStr);
          eventsQuery = eventsQuery.gte('event_date', startDateStr);
        }
      }

      const [paymentsResult, expensesResult, staffResult, freelancerResult, eventsResult] = await Promise.all([
        paymentsQuery,
        expensesQuery,
        staffQuery,
        freelancerQuery,
        eventsQuery
      ]);

      const calculateBreakdown = (data: any[]) => 
        data?.reduce((acc, item) => {
          if (item.payment_method === 'Cash') {
            acc.cash += item.amount;
          } else {
            acc.digital += item.amount;
          }
          return acc;
        }, { cash: 0, digital: 0 }) || { cash: 0, digital: 0 };

      // Calculate payment method breakdown only from payments table 
      // (advance amounts are already included via database trigger)
      const paymentInBreakdown = calculateBreakdown(paymentsResult.data || []);
      const expenseBreakdown = calculateBreakdown(expensesResult.data || []);
      const staffBreakdown = calculateBreakdown(staffResult.data || []);
      const freelancerBreakdown = calculateBreakdown(freelancerResult.data || []);
      
      const paymentOutBreakdown = {
        cash: expenseBreakdown.cash + staffBreakdown.cash + freelancerBreakdown.cash,
        digital: expenseBreakdown.digital + staffBreakdown.digital + freelancerBreakdown.digital
      };
      
      setPaymentBreakdowns({
        paymentIn: paymentInBreakdown,
        paymentOut: paymentOutBreakdown,
        totalExpenses: expenseBreakdown,
        staffPayments: staffBreakdown,
        freelancerPayments: freelancerBreakdown
      });
    } catch (error) {
      console.error('Error fetching payment breakdowns:', error);
    }
  };

  // FIXED: Payment Out = total expenses + staff payments + freelancer payments (from stats)
  const paymentOut = stats.paymentOut;
  
  return (
    <div className="space-y-4">
      {/* Critical Financial Stats */}
      <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
        <StatCard
          title="Payment In"
          value={`₹${stats.paymentIn.toLocaleString()}`}
          icon={<MoneyReceive01Icon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
          paymentBreakdown={paymentBreakdowns.paymentIn}
        />
        <StatCard
          title="Payment Out"
          value={`₹${paymentOut.toLocaleString()}`}
          icon={<MoneyBag02Icon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
          paymentBreakdown={paymentBreakdowns.paymentOut}
        />
        <StatCard
          title="Net Profit"
          value={`₹${(stats.paymentIn - paymentOut).toLocaleString()}`}
          icon={<AnalyticsUpIcon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
          paymentBreakdown={{
            cash: (paymentBreakdowns.paymentIn?.cash || 0) - (paymentBreakdowns.paymentOut?.cash || 0),
            digital: (paymentBreakdowns.paymentIn?.digital || 0) - (paymentBreakdowns.paymentOut?.digital || 0)
          }}
        />
        <StatCard
          title="Pending Amount"
          value={`₹${stats.pendingAmount.toLocaleString()}`}
          icon={<ChartHistogramIcon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
        />
      </div>
    </div>
  );
};

export default FinanceStats;