
import { Event } from '@/types/studio';
import StatsGrid from '@/components/ui/stats-grid';
import { Calendar01Icon, DollarCircleIcon, Tick02Icon, UserIcon } from 'hugeicons-react';

interface EventStatsProps {
  events: Event[];
}

const EventStats = ({ events }: EventStatsProps) => {
  const calculateEventStats = () => {
    const totalEvents = events.length;
    const totalRevenue = events.reduce((sum, event) => sum + (event.total_amount || 0), 0);
    const confirmedEvents = events.filter(e => e.total_amount && e.total_amount > 0).length;
    const completedEvents = events.filter(event => new Date(event.event_date) <= new Date()).length;

    return { totalEvents, totalRevenue, confirmedEvents, completedEvents };
  };

  const stats = calculateEventStats();

  return (
    <StatsGrid stats={[
      {
        title: "Total Events",
        value: stats.totalEvents,
        icon: <Calendar01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Total Revenue",
        value: `₹${stats.totalRevenue.toLocaleString()}`,
        icon: <DollarCircleIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Confirmed Events",
        value: stats.confirmedEvents,
        icon: <Tick02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Completed Events",
        value: stats.completedEvents,
        icon: <UserIcon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      }
    ]} />
  );
};

export default EventStats;
