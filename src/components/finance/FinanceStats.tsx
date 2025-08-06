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
  // Calculate Payment Out as total expenses + staff payments
  const paymentOut = stats.totalExpenses + stats.paymentOut;
  
  return (
    <div className="space-y-4">
      {/* First Row - Financial Overview */}
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
          title: "Payment Out",
          value: `₹${paymentOut.toLocaleString()}`,
          icon: <MoneyBag02Icon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        },
        {
          title: "Net Profit",
          value: `₹${(stats.paymentIn - paymentOut).toLocaleString()}`,
          icon: <AnalyticsUpIcon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        }
      ]} />
      
      {/* Second Row - Operational Details */}
      <StatsGrid stats={[
        {
          title: "Total Events",
          value: stats.totalEvents,
          icon: <Calendar01Icon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        },
        {
          title: "Total Expense",
          value: `₹${stats.totalExpenses.toLocaleString()}`,
          icon: <CreditCardIcon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        },
        {
          title: "Total Paid Salary",
          value: `₹${stats.paymentOut.toLocaleString()}`,
          icon: <Tick02Icon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        },
        {
          title: "Pending Amount",
          value: `₹${stats.pendingAmount.toLocaleString()}`,
          icon: <ChartHistogramIcon className="h-4 w-4" />,
          colorClass: "bg-primary/20 text-primary"
        }
      ]} />
    </div>
  );
};

export default FinanceStats;