import { Button } from '@/components/ui/button';
import { Add01Icon } from 'hugeicons-react';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { Task } from '@/types/studio';

interface TaskManagementHeaderProps {
  isAdmin: boolean;
  hasData: boolean;
  exportConfig: ReturnType<typeof import('@/hooks/useExportConfigs').useTaskExportConfig>;
  tasks: Task[];
  onCreateTask: () => void;
}

export const TaskManagementHeader = ({
  isAdmin,
  hasData,
  exportConfig,
  tasks,
  onCreateTask
}: TaskManagementHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        Tasks
      </h1>
      <div className="flex items-center gap-2">
        {hasData && isAdmin && (
          <UniversalExportDialog 
            data={tasks}
            config={exportConfig}
          />
        )}
        {isAdmin && (
          <Button onClick={onCreateTask} className="rounded-full p-3">
            <Add01Icon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};