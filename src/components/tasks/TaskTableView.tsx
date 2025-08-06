
import { useState } from 'react';
import { Task, Event, TaskStatus } from '@/types/studio';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit01Icon, Delete02Icon, Alert01Icon } from 'hugeicons-react';
import { CustomizeIcon } from 'hugeicons-react';
import { TaskDeleteConfirmation } from './TaskDeleteConfirmation';
import TaskReportDialog from './TaskReportDialog';
import FreelancerTaskStatusDialog from './FreelancerTaskStatusDialog';
import { useToast } from '@/hooks/use-toast';

interface TaskTableViewProps {
  tasks: (Task & { event?: Event; assigned_staff?: any })[];
  onEdit: (task: Task) => void;
  onStatusChange: () => void;
}

const TaskTableView = ({ tasks, onEdit, onStatusChange }: TaskTableViewProps) => {
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [reportingTask, setReportingTask] = useState<Task | null>(null);
  const [statusChangeTask, setStatusChangeTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
      'Completed': 'bg-green-100 text-green-800 border-green-300',
      'On Hold': 'bg-red-100 text-red-800 border-red-300',
      'Waiting for Response': 'bg-gray-100 text-gray-800 border-gray-300',
      'Under Review': 'bg-red-100 text-red-800 border-red-300',
      'Accepted': 'bg-emerald-100 text-emerald-800 border-emerald-300',
      'Declined': 'bg-rose-100 text-rose-800 border-rose-300'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'Low': 'bg-gray-100 text-gray-700',
      'Medium': 'bg-blue-100 text-blue-700',
      'High': 'bg-orange-100 text-orange-700',
      'Urgent': 'bg-red-100 text-red-700'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Task</TableHead>
            <TableHead className="font-semibold">Event</TableHead>
            <TableHead className="font-semibold">Assigned To</TableHead>
            <TableHead className="font-semibold">Priority</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Due Date</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id} className="hover:bg-muted/25">
              <TableCell className="max-w-xs">
                <div>
                  <div className="font-medium text-sm">{task.title}</div>
                  {task.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {task.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {task.event ? (
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {task.event.title} ({task.event.event_type})
                    </Badge>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No Event</span>
                )}
              </TableCell>
              <TableCell>
                {task.assigned_staff ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">{task.assigned_staff.full_name}</span>
                    {task.freelancer_id && (
                      <Badge variant="secondary" className="text-xs">
                        Freelancer
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
                  {task.status}
                </Badge>
              </TableCell>
              <TableCell>
                {task.due_date ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs">
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                    {new Date(task.due_date) < new Date() && task.status !== 'Completed' && (
                      <Badge variant="destructive" className="text-xs ml-1">
                        Overdue
                      </Badge>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No due date</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center gap-2">
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
                       onClick={() => setStatusChangeTask(task)}
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
                      onClick={() => setReportingTask(task)}
                      className="h-8 w-8 p-0 rounded-full"
                      title="Report Issue"
                    >
                      <Alert01Icon className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="action-delete"
                    size="sm"
                    onClick={() => setTaskToDelete(task)}
                    className="h-8 w-8 p-0 rounded-full"
                    title="Delete task"
                  >
                    <Delete02Icon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <TaskDeleteConfirmation
        task={taskToDelete}
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        onSuccess={onStatusChange}
      />
      
      {reportingTask && (
        <TaskReportDialog
          task={reportingTask}
          open={!!reportingTask}
          onOpenChange={(open) => !open && setReportingTask(null)}
          onSuccess={onStatusChange}
        />
      )}
      
      <FreelancerTaskStatusDialog
        task={statusChangeTask}
        open={!!statusChangeTask}
        onOpenChange={(open) => !open && setStatusChangeTask(null)}
        onStatusChange={onStatusChange}
      />
    </div>
  );
};

export default TaskTableView;
