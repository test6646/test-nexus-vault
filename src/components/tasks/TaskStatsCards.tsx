import React from 'react';
import { Tick02Icon, Clock01Icon, Calendar01Icon } from 'hugeicons-react';
import StatsGrid from '@/components/ui/stats-grid';
import { useGlobalTaskStats } from '@/hooks/useGlobalTaskStats';

interface TaskStats {
  totalTasks: number;
  completedTasksCount: number;
  staffTasks: number;
  freelancerTasks: number;
}

export const TaskStatsCards = React.memo(() => {
  const { tasks, loading } = useGlobalTaskStats();

  const getStats = (): TaskStats => {
    const totalTasks = tasks.length;
    const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
    const staffTasks = tasks.filter(t => t.assigned_to && !t.freelancer_id).length;
    const freelancerTasks = tasks.filter(t => t.freelancer_id).length;

    return { totalTasks, completedTasksCount, staffTasks, freelancerTasks };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 h-[80px] sm:h-[150px] flex flex-col items-center justify-center bg-card border-2 border-primary/30 rounded-full shadow-sm animate-pulse">
            <div className="flex flex-col items-center justify-center space-y-0 p-1 sm:pb-1 md:pb-1 sm:px-2 md:px-3 sm:pt-1 md:pt-2">
              <div className="hidden sm:block p-1 md:p-2 rounded-full bg-primary/10 mb-1 md:mb-1">
                <div className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full bg-gray-300 animate-pulse" />
              </div>
              <div className="h-2 sm:h-3 md:h-4 w-12 sm:w-16 md:w-20 rounded bg-gray-300 animate-pulse" />
            </div>
            <div className="flex items-center justify-center pt-0 pb-1 sm:pb-1 md:pb-2 px-1 sm:px-2 md:px-3">
              <div className="h-3 sm:h-4 md:h-6 w-6 sm:w-8 md:w-12 rounded bg-gray-300 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <StatsGrid
      stats={[
        {
          title: 'Total Tasks',
          value: stats.totalTasks,
          icon: <Tick02Icon className="h-4 w-4" />,
          colorClass: 'bg-primary/20 text-primary',
        },
        {
          title: 'Completed',
          value: stats.completedTasksCount,
          icon: <Tick02Icon className="h-4 w-4" />,
          colorClass: 'bg-primary/20 text-primary',
        },
        {
          title: 'Staff Tasks',
          value: stats.staffTasks,
          icon: <Clock01Icon className="h-4 w-4" />,
          colorClass: 'bg-primary/20 text-primary',
        },
        {
          title: 'Freelancer Tasks',
          value: stats.freelancerTasks,
          icon: <Calendar01Icon className="h-4 w-4" />,
          colorClass: 'bg-primary/20 text-primary',
        },
      ]}
    />
  );
});

TaskStatsCards.displayName = 'TaskStatsCards';
