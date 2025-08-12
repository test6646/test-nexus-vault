import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import EnhancedStatCard from '@/components/ui/enhanced-stat-card';
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
      const { data: staffPayments } = await supabase
        .from('staff_payments')
        .select('amount, payment_method')
        .eq('firm_id', currentFirmId);

      const breakdown = staffPayments?.reduce((acc, payment) => {
        if (payment.payment_method === 'Cash') {
          acc.cash += payment.amount;
        } else {
          acc.digital += payment.amount;
        }
        return acc;
      }, { cash: 0, digital: 0 }) || { cash: 0, digital: 0 };

      setPaymentBreakdowns({ totalPaid: breakdown });
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
    <div className="grid gap-1 sm:gap-3 md:gap-4 grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
      <EnhancedStatCard
        title="Total Earnings"
        value={`₹${(stats?.totalEarnings || 0).toLocaleString()}`}
        icon={<MoneyBag02Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
      <EnhancedStatCard
        title="Total Paid"
        value={`₹${(stats?.totalPaid || 0).toLocaleString()}`}
        icon={<Calendar01Icon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
        paymentBreakdown={paymentBreakdowns.totalPaid}
      />
      <EnhancedStatCard
        title="Total Tasks Paid"
        value={`₹${(stats?.taskPaymentsTotal || 0).toLocaleString()}`}
        icon={<DollarCircleIcon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
      <EnhancedStatCard
        title="Total Assignments Paid"
        value={`₹${(stats?.assignmentRatesTotal || 0).toLocaleString()}`}
        icon={<ChartBarLineIcon className="h-4 w-4" />}
        colorClass="bg-primary/20 text-primary"
      />
    </div>
  );
};

export default SalaryStats;