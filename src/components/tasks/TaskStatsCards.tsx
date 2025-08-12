import { Tick02Icon, Clock01Icon, Calendar01Icon } from 'hugeicons-react';
import StatsGrid from '@/components/ui/stats-grid';
import { Task } from '@/types/studio';

interface TaskStatsCardsProps {
  tasks: Task[];
}

interface TaskStats {
  totalTasks: number;
  completedTasksCount: number;
  staffTasks: number;
  freelancerTasks: number;
}

export const TaskStatsCards = ({ tasks }: TaskStatsCardsProps) => {
  const getStats = (): TaskStats => {
    const totalTasks = tasks.length;
    const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
    const staffTasks = tasks.filter(t => t.assigned_to && !t.freelancer_id).length;
    const freelancerTasks = tasks.filter(t => t.freelancer_id).length;
    
    return { totalTasks, completedTasksCount, staffTasks, freelancerTasks };
  };

  const stats = getStats();

  return (
    <StatsGrid stats={[
      {
        title: "Total Tasks",
        value: stats.totalTasks,
        icon: <Tick02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Completed",
        value: stats.completedTasksCount,
        icon: <Tick02Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Staff Tasks",
        value: stats.staffTasks,
        icon: <Clock01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
      {
        title: "Freelancer Tasks",
        value: stats.freelancerTasks,
        icon: <Calendar01Icon className="h-4 w-4" />,
        colorClass: "bg-primary/20 text-primary"
      },
    ]} />
  );
};