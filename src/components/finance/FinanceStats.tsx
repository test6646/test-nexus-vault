import StatsGrid from '@/components/ui/stats-grid';
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
}

const FinanceStats = ({ stats }: FinanceStatsProps) => {
  return (
    <StatsGrid stats={[
      {
        title: "Total Revenue",
        value: `₹${stats.totalRevenue.toLocaleString()}`,
        icon: <DollarCircleIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Payment In",
        value: `₹${stats.paymentIn.toLocaleString()}`,
        icon: <MoneyReceive01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Total Expenses",
        value: `₹${stats.totalExpenses.toLocaleString()}`,
        icon: <MoneyBag02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Net Profit",
        value: `₹${stats.netProfit.toLocaleString()}`,
        icon: <AnalyticsUpIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Total Events",
        value: stats.totalEvents,
        icon: <Calendar01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Completed Events",
        value: stats.completedEvents,
        icon: <Tick02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Active Events",
        value: stats.activeEvents,
        icon: <ChartHistogramIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Pending Amount",
        value: `₹${stats.pendingAmount.toLocaleString()}`,
        icon: <CreditCardIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      }
    ]} />
  );
};

export default FinanceStats;