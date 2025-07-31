
import StatCard from './stat-card';

interface StatItem {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

const StatsGrid = ({ stats }: StatsGridProps) => {
  return (
    <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          colorClass={stat.colorClass}
        />
      ))}
    </div>
  );
};

export default StatsGrid;
