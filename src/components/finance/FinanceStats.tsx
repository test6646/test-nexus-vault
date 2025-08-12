import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useState, useEffect } from 'react';
import EnhancedStatCard from '@/components/ui/enhanced-stat-card';
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

      // Include advance amounts from filtered events in Payment In breakdown
      const advanceBreakdown = eventsResult.data?.reduce((acc, event) => {
        const method = event.advance_payment_method || 'Cash';
        if (method === 'Cash') {
          acc.cash += event.advance_amount || 0;
        } else {
          acc.digital += event.advance_amount || 0;
        }
        return acc;
      }, { cash: 0, digital: 0 }) || { cash: 0, digital: 0 };

      setPaymentBreakdowns({
        paymentIn: {
          cash: (calculateBreakdown(paymentsResult.data || [])).cash + advanceBreakdown.cash,
          digital: (calculateBreakdown(paymentsResult.data || [])).digital + advanceBreakdown.digital
        },
        totalExpenses: calculateBreakdown(expensesResult.data || []),
        staffPayments: calculateBreakdown(staffResult.data || []),
        freelancerPayments: calculateBreakdown(freelancerResult.data || [])
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
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
        <EnhancedStatCard
          title="Payment In"
          value={`₹${stats.paymentIn.toLocaleString()}`}
          icon={<MoneyReceive01Icon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
          paymentBreakdown={paymentBreakdowns.paymentIn}
        />
        <EnhancedStatCard
          title="Payment Out"
          value={`₹${paymentOut.toLocaleString()}`}
          icon={<MoneyBag02Icon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
          paymentBreakdown={{
            cash: (paymentBreakdowns.totalExpenses?.cash || 0) + (paymentBreakdowns.staffPayments?.cash || 0) + (paymentBreakdowns.freelancerPayments?.cash || 0),
            digital: (paymentBreakdowns.totalExpenses?.digital || 0) + (paymentBreakdowns.staffPayments?.digital || 0) + (paymentBreakdowns.freelancerPayments?.digital || 0)
          }}
        />
        <EnhancedStatCard
          title="Net Profit"
          value={`₹${(stats.paymentIn - paymentOut).toLocaleString()}`}
          icon={<AnalyticsUpIcon className="h-4 w-4" />}
          colorClass="bg-primary/20 text-primary"
          paymentBreakdown={{
            cash: (paymentBreakdowns.paymentIn?.cash || 0) - ((paymentBreakdowns.totalExpenses?.cash || 0) + (paymentBreakdowns.staffPayments?.cash || 0) + (paymentBreakdowns.freelancerPayments?.cash || 0)),
            digital: (paymentBreakdowns.paymentIn?.digital || 0) - ((paymentBreakdowns.totalExpenses?.digital || 0) + (paymentBreakdowns.staffPayments?.digital || 0) + (paymentBreakdowns.freelancerPayments?.digital || 0))
          }}
        />
        <EnhancedStatCard
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