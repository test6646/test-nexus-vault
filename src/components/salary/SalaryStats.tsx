import React from 'react';
import StatsGrid from '@/components/ui/stats-grid';
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
    totalEarnings: number;
    totalPaid: number;
    totalPending: number;
    thisMonthPaid: number;
    avgEarningsPerStaff: number;
  } | null;
  loading: boolean;
}

const SalaryStats = ({ stats, loading }: SalaryStatsProps) => {
  if (loading) {
    return (
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="min-h-[70px] sm:min-h-[80px] md:min-h-[120px] bg-gray-200 animate-pulse rounded-full" />
        ))}
      </div>
    );
  }

  const statItems = [
    {
      title: "Total Staff",
      value: stats?.totalStaff || 0,
      icon: <UserIcon className="h-4 w-4" />,
      colorClass: "bg-primary/20 text-primary"
    },
    {
      title: "Total Earnings",
      value: `₹${(stats?.totalEarnings || 0).toLocaleString()}`,
      icon: <MoneyBag02Icon className="h-4 w-4" />,
      colorClass: "bg-primary/20 text-primary"
    },
    {
      title: "Total Paid",
      value: `₹${(stats?.totalPaid || 0).toLocaleString()}`,
      icon: <DollarCircleIcon className="h-4 w-4" />,
      colorClass: "bg-primary/20 text-primary"
    },
    {
      title: "Pending Amount",
      value: `₹${(stats?.totalPending || 0).toLocaleString()}`,
      icon: <Alert01Icon className="h-4 w-4" />,
      colorClass: "bg-primary/20 text-primary"
    },
    {
      title: "This Month Paid",
      value: `₹${(stats?.thisMonthPaid || 0).toLocaleString()}`,
      icon: <Calendar01Icon className="h-4 w-4" />,
      colorClass: "bg-primary/20 text-primary"
    },
    {
      title: "Avg per Staff",
      value: `₹${(stats?.avgEarningsPerStaff || 0).toLocaleString()}`,
      icon: <ChartBarLineIcon className="h-4 w-4" />,
      colorClass: "bg-primary/20 text-primary"
    }
  ];

  return <StatsGrid stats={statItems} />;
};

export default SalaryStats;