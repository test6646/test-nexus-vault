import { useState } from 'react';
import { PageTableSkeleton } from '@/components/ui/skeleton';
import { Task } from '@/types/studio';
import { TaskFormDialog } from './TaskFormDialog';
import { useTaskExportConfig } from '@/hooks/useExportConfigs';
import { useTasks } from './hooks/useTasks';
import { TaskManagementHeader } from './TaskManagementHeader';
import { TaskStatsCards } from './TaskStatsCards';

import { TaskContent } from './TaskContent';

const TaskManagementCore = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const {
    tasks,
    events,
    staffMembers,
    loading,
    isAdmin,
    loadTasks,
    updateTaskStatus
  } = useTasks();

  const taskExportConfig = useTaskExportConfig(staffMembers);

  const handleTaskSuccess = async () => {
    await loadTasks();
    setIsDialogOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setIsDialogOpen(true);
  };

  // Show all tasks without filtering
  const tasksToShow = tasks;

  if (loading) {
    return <PageTableSkeleton />;
  }

  return (
    <div className="space-y-6">
      <TaskManagementHeader
        isAdmin={isAdmin}
        hasData={tasks.length > 0}
        exportConfig={taskExportConfig}
        tasks={tasks}
        onCreateTask={handleNewTask}
      />

      <TaskStatsCards tasks={tasks} />


      <TaskContent
        tasks={tasksToShow}
        isAdmin={isAdmin}
        onEdit={handleEdit}
        onStatusChange={loadTasks}
        onUpdateTaskStatus={updateTaskStatus}
        onCreateTask={handleNewTask}
      />

      {isAdmin && (
        <TaskFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSuccess={handleTaskSuccess}
          editingTask={editingTask}
          events={events}
          staffMembers={staffMembers}
        />
      )}
    </div>
  );
};

export default TaskManagementCore;
