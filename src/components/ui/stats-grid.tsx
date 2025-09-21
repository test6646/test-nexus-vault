
import StatCard from './stat-card';

interface PaymentBreakdown {
  cash: number;
  digital: number;
}

interface StatItem {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  colorClass?: string;
  paymentBreakdown?: PaymentBreakdown;
}

interface StatsGridProps {
  stats: StatItem[];
}

const StatsGrid = ({ stats }: StatsGridProps) => {
  return (
    <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          colorClass={stat.colorClass}
          paymentBreakdown={stat.paymentBreakdown}
        />
      ))}
    </div>
  );
};

export default StatsGrid;
