import { Task, Event } from '@/types/studio';
import { SimpleTable } from '@/components/pdf/SharedPDFLayout';
import { Button } from '@/components/ui/button';
import { Edit01Icon, Delete02Icon, Alert01Icon, CustomizeIcon } from 'hugeicons-react';
import { getStatusColor, getPriorityColor } from '@/lib/task-status-utils';

interface SimpleTaskTableProps {
  tasks: (Task & { event?: Event; assigned_staff?: any })[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task) => void;
  onReport: (task: Task) => void;
}

const SimpleTaskTable = ({ tasks, onEdit, onDelete, onStatusChange, onReport }: SimpleTaskTableProps) => {
  const getStatusColorLocal = (status: string) => {
    return getStatusColor(status as any);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'Low': 'text-muted-foreground',
      'Medium': 'text-info',
      'High': 'text-warning',
      'Urgent': 'text-destructive'
    } as const;
    return (colors as Record<string, string>)[priority] || 'text-muted-foreground';
  };

  const headers = ['Task', 'Event', 'Assigned To', 'Priority', 'Status', 'Due Date', 'Actions'];

  const rows = tasks.map((task) => [
    task.title,
    task.event ? `${task.event.title} (${task.event.event_type})` : 'No Event',
    task.assigned_staff 
      ? `${task.assigned_staff.full_name}${task.freelancer_id ? ' (Freelancer)' : ''}`
      : 'Unassigned',
    task.priority,
    task.status,
    task.due_date 
      ? new Date(task.due_date).toLocaleDateString()
      : '~',
    // Actions column with buttons
    <div key={task.id} className="flex items-center gap-2 justify-center">
      <Button
        variant="action-edit"
        size="sm"
        onClick={() => onEdit(task)}
        className="h-8 w-8 p-0 rounded-full"
        title="Edit task"
      >
        <Edit01Icon className="h-3.5 w-3.5" />
      </Button>
      {task.freelancer_id && (
        <Button
          variant="action-status"
          size="sm"
          onClick={() => onStatusChange(task)}
          className="h-8 w-8 p-0 rounded-full"
          title="Change Status (Freelancer)"
        >
          <CustomizeIcon className="h-3.5 w-3.5" />
        </Button>
      )}
      {task.status === 'Completed' && (
        <Button
          variant="action-report"
          size="sm"
          onClick={() => onReport(task)}
          className="h-8 w-8 p-0 rounded-full"
          title="Report Issue"
        >
          <Alert01Icon className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="action-delete"
        size="sm"
        onClick={() => onDelete(task)}
        className="h-8 w-8 p-0 rounded-full"
        title="Delete task"
      >
        <Delete02Icon className="h-3.5 w-3.5" />
      </Button>
    </div>
  ]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((header, index) => (
                <th 
                  key={index}
                  className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b bg-muted/50"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                className={`hover:bg-muted/25 ${rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}
              >
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex}
                    className="px-4 py-3 text-sm border-b border-border/50 text-center"
                  >
                    {cellIndex === 0 ? ( // Task title column
                      <div className="text-center">
                        <div className="font-medium">{tasks[rowIndex].title}</div>
                        {tasks[rowIndex].description && (
                          <div className="text-muted-foreground text-xs mt-1">
                            {tasks[rowIndex].description.substring(0, 50)}...
                          </div>
                        )}
                      </div>
                    ) : cellIndex === 3 ? ( // Priority column
                      <span className={`font-medium ${getPriorityColor(cell as string)}`}>
                        {cell}
                      </span>
                    ) : cellIndex === 4 ? ( // Status column
                      <span className={`font-medium ${getStatusColorLocal(cell as string)}`}>
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SimpleTaskTable;