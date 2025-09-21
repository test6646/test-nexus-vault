import React from 'react';
import { Button } from '@/components/ui/button';
import { Add01Icon } from 'hugeicons-react';
import UniversalExportDialog from '@/components/common/UniversalExportDialog';
import { Task } from '@/types/studio';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';

interface TaskManagementHeaderProps {
  isAdmin: boolean;
  hasData: boolean;
  exportConfig: ReturnType<typeof import('@/hooks/useExportConfigs').useTaskExportConfig>;
  tasks: Task[];
  onCreateTask: () => void;
}

export const TaskManagementHeader = React.memo(({
  isAdmin,
  hasData,
  exportConfig,
  tasks,
  onCreateTask
}: TaskManagementHeaderProps) => {
  const { canCreateNew, canExport } = useSubscriptionAccess();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Tasks
        </h1>
        
        <div className="flex items-center gap-2">
          {hasData && isAdmin && canExport && (
            <UniversalExportDialog 
              data={tasks}
              config={exportConfig}
            />
          )}
          {isAdmin && (
            <Button 
              onClick={onCreateTask} 
              className="rounded-full p-3"
              disabled={!canCreateNew}
            >
              <Add01Icon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

TaskManagementHeader.displayName = 'TaskManagementHeader';