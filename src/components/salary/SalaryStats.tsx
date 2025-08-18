import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import StatCard from '@/components/ui/stat-card';
import { 
  MoneyBag02Icon, 
  DollarCircleIcon, 
  UserIcon, 
  ChartBarLineIcon,
  Alert01Icon,
  Calendar01Icon
} from 'hugeicons-react';

interface SalaryStatsProps {
  stats: {
    totalStaff: number;
    totalFreelancers: number;
    taskPaymentsTotal: number;
    assignmentRatesTotal: number;
    totalPaid: number;
    totalPending: number;
    avgPerPerson: number;
    totalEarnings: number;
  } | null;
  loading: boolean;
}

const SalaryStats = ({ stats, loading }: SalaryStatsProps) => {
  const { profile, currentFirmId } = useAuth();
  const [paymentBreakdowns, setPaymentBreakdowns] = useState<any>({});

  useEffect(() => {
    if (currentFirmId && stats) {
      fetchPaymentBreakdowns();
    }
  }, [currentFirmId, stats]);

  const fetchPaymentBreakdowns = async () => {
    if (!currentFirmId) return;

    try {
      // Get staff payments breakdown
      const { data: staffPayments } = await supabase
        .from('staff_payments')
        .select('amount, payment_method')
        .eq('firm_id', currentFirmId);

      // Get freelancer payments breakdown
      const { data: freelancerPayments } = await supabase
        .from('freelancer_payments')
        .select('amount, payment_method')
        .eq('firm_id', currentFirmId);

      // Get task payments breakdown (from tasks with amount > 0)
      const { data: taskPayments } = await supabase
        .from('tasks')
        .select('amount, salary_details')
        .eq('firm_id', currentFirmId)
        .not('amount', 'is', null)
        .gt('amount', 0);

      const staffBreakdown = staffPayments?.reduce((acc, payment) => {
        if (payment.payment_method === 'Cash') {
          acc.cash += payment.amount || 0;
        } else {
          acc.digital += payment.amount || 0;
        }
        return acc;
      }, { cash: 0, digital: 0 }) || { cash: 0, digital: 0 };

      const freelancerBreakdown = freelancerPayments?.reduce((acc, payment) => {
        if (payment.payment_method === 'Cash') {
          acc.cash += payment.amount || 0;
        } else {
          acc.digital += payment.amount || 0;
        }
        return acc;
      }, { cash: 0, digital: 0 }) || { cash: 0, digital: 0 };

      const taskBreakdown = taskPayments?.reduce((acc, task) => {
        const salaryDetails = task.salary_details as any;
        const paymentMethod = salaryDetails?.payment_method || 'Cash';
        if (paymentMethod === 'Cash') {
          acc.cash += task.amount || 0;
        } else {
          acc.digital += task.amount || 0;
        }
        return acc;
      }, { cash: 0, digital: 0 }) || { cash: 0, digital: 0 };

      const totalPaidBreakdown = {
        cash: staffBreakdown.cash + freelancerBreakdown.cash,
        digital: staffBreakdown.digital + freelancerBreakdown.digital
      };

      const totalEarningsBreakdown = {
        cash: totalPaidBreakdown.cash + taskBreakdown.cash,
        digital: totalPaidBreakdown.digital + taskBreakdown.digital
      };

      setPaymentBreakdowns({
        totalEarnings: totalEarningsBreakdown,
        totalPaid: totalPaidBreakdown,
        taskPayments: taskBreakdown,
        assignmentRates: { cash: 0, digital: 0 } // Assignment rates don't have payment methods in DB
      });
    } catch (error) {
      console.error('Error fetching payment breakdowns:', error);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="min-h-[70px] sm:min-h-[80px] md:min-h-[120px] bg-gray-200 animate-pulse rounded-full" />
        ))}
      </div>
    );
  }

  // 🚀 OPTIMIZED: Using the StatCard component consistently
  const statItems = [
    // Top row (4 cards)
    {
      title: "Total Staff",
      value: stats?.totalStaff || 0,
      icon: <UserIcon className="h-4 w-4" />,
      colorClass: "bg-primary/10 text-primary"
    },
    {
      title: "Total Freelancer",
      value: stats?.totalFreelancers || 0,
      icon: <UserIcon className="h-4 w-4" />,
      colorClass: "bg-primary/10 text-primary"
    },
    {
      title: "Total People",
      value: (stats?.totalStaff || 0) + (stats?.totalFreelancers || 0),
      icon: <UserIcon className="h-4 w-4" />,
      colorClass: "bg-primary/10 text-primary"
    },
    {
      title: "Avg per Person",
      value: `₹${Math.round(stats?.avgPerPerson || 0).toLocaleString()}`,
      icon: <ChartBarLineIcon className="h-4 w-4" />,
      colorClass: "bg-primary/10 text-primary"
    },
    // Bottom row (4 cards)
    {
      title: "Task Payments Total",
      value: `₹${(stats?.taskPaymentsTotal || 0).toLocaleString()}`,
      icon: <MoneyBag02Icon className="h-4 w-4" />,
      colorClass: "bg-success/10 text-success"
    },
    {
      title: "Assignment Rate Total",
      value: `₹${(stats?.assignmentRatesTotal || 0).toLocaleString()}`,
      icon: <DollarCircleIcon className="h-4 w-4" />,
      colorClass: "bg-info/10 text-info"
    },
    {
      title: "Total Paid",
      value: `₹${(stats?.totalPaid || 0).toLocaleString()}`,
      icon: <Calendar01Icon className="h-4 w-4" />,
      colorClass: "bg-success/10 text-success"
    },
    {
      title: "Total Pending",
      value: `₹${(stats?.totalPending || 0).toLocaleString()}`,
      icon: <Alert01Icon className="h-4 w-4" />,
      colorClass: stats?.totalPending && stats.totalPending > 0 ? "bg-warning/10 text-warning" : "bg-gray-100 text-gray-600"
    }
  ];

  return (
    <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
      <StatCard
        title="Total Earnings"
        value={`₹${(stats?.totalEarnings || 0).toLocaleString()}`}
        icon={<MoneyBag02Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
        paymentBreakdown={paymentBreakdowns.totalEarnings}
      />
      <StatCard
        title="Total Paid"
        value={`₹${(stats?.totalPaid || 0).toLocaleString()}`}
        icon={<Calendar01Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
        paymentBreakdown={paymentBreakdowns.totalPaid}
      />
      <StatCard
        title="Task Payments"
        value={`₹${(stats?.taskPaymentsTotal || 0).toLocaleString()}`}
        icon={<DollarCircleIcon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
        paymentBreakdown={paymentBreakdowns.taskPayments}
      />
      <StatCard
        title="Assignment Rates"
        value={`₹${(stats?.assignmentRatesTotal || 0).toLocaleString()}`}
        icon={<ChartBarLineIcon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
        paymentBreakdown={paymentBreakdowns.assignmentRates}
      />
    </div>
  );
};

export default SalaryStats;