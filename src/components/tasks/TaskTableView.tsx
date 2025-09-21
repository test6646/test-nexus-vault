
import { useState } from 'react';
import { Task, Event, TaskStatus } from '@/types/studio';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Edit01Icon, Alert01Icon, Delete02Icon } from 'hugeicons-react';
import { CustomizeIcon } from 'hugeicons-react';
import TaskReportDialog from './TaskReportDialog';
import TaskStatusDialog from './TaskStatusDialog';
import { useToast } from '@/hooks/use-toast';

interface TaskTableViewProps {
  tasks: (Task & { event?: Event; assigned_staff?: any; freelancer?: any })[];
  onEdit: (task: Task) => void;
  onStatusChange: () => void;
  onUpdateTaskStatus: (taskId: string, status: any) => void;
  onDelete: (taskId: string) => void;
}

const TaskTableView = ({ tasks, onEdit, onStatusChange, onUpdateTaskStatus, onDelete }: TaskTableViewProps) => {
  const [reportingTask, setReportingTask] = useState<Task | null>(null);
  const [statusChangeTask, setStatusChangeTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
  const colors = {
    'Pending': 'text-[hsl(var(--warning))]',
    'In Progress': 'text-[hsl(var(--info))]',
    'Completed': 'text-[hsl(var(--success))]',
    'On Hold': 'text-[hsl(var(--destructive))]',
    'Waiting for Response': 'text-muted-foreground',
    'Under Review': 'text-[hsl(var(--warning))]',
    'Accepted': 'text-[hsl(var(--success))]',
    'Declined': 'text-[hsl(var(--destructive))]'
  } as const;
  return (colors as Record<string, string>)[status] || 'text-muted-foreground';
  };

  const getPriorityColor = (priority: string) => {
  const colors = {
    'Low': 'text-muted-foreground',
    'Medium': 'text-[hsl(var(--info))]',
    'High': 'text-[hsl(var(--warning))]',
    'Urgent': 'text-[hsl(var(--destructive))]'
  } as const;
  return (colors as Record<string, string>)[priority] || 'text-muted-foreground';
  };

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Task</TableHead>
              <TableHead className="text-center">Event</TableHead>
              <TableHead className="text-center">Assigned To</TableHead>
              <TableHead className="text-center">Priority</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Due Date</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className="hover:bg-muted/25">
                <TableCell className="max-w-xs text-center">
                  <div>
                    <div className="font-medium text-sm">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {task.event ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {task.event.title}{task.event.event_type ? ` (${task.event.event_type})` : ''}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No Event</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {task.freelancer && task.freelancer.full_name ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{task.freelancer.full_name}</span>
                      <span className="text-xs text-blue-600 font-medium">
                        (Freelancer)
                      </span>
                    </div>
                  ) : task.assigned_staff && task.assigned_staff.full_name ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">{task.assigned_staff.full_name}</span>
                      <span className="text-xs text-green-600 font-medium">
                        (Staff)
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {task.due_date ? (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs">
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                      {new Date(task.due_date) < new Date() && task.status !== 'Completed' && (
                        <span className="text-xs text-[hsl(var(--destructive))] font-medium ml-1">
                          Overdue
                        </span>
                      )}
                    </div>
                   ) : (
                     <span className="text-xs text-muted-foreground">~</span>
                   )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="action-edit"
                      size="sm"
                      onClick={() => onEdit(task)}
                      className="h-8 w-8 p-0 rounded-full"
                      title="Edit task"
                    >
                      <Edit01Icon className="h-3.5 w-3.5" />
                    </Button>
                     {(task.freelancer_id || task.assigned_to) && (
                       <Button
                         variant="action-status"
                         size="sm"
                         onClick={() => setStatusChangeTask(task)}
                         className="h-8 w-8 p-0 rounded-full"
                         title={`Change Status (${task.freelancer_id ? 'Freelancer' : 'Staff'})`}
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
                       onClick={() => onDelete(task.id)}
                       className="h-8 w-8 p-0 rounded-full"
                       title="Delete Task"
                     >
                       <Delete02Icon className="h-3.5 w-3.5" />
                     </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {tasks.map((task) => (
          <Card key={task.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-foreground">
                      {task.title}
                    </span>
                  </div>
                   <div className="text-sm text-muted-foreground mb-1">
                     {task.description || '~'}
                   </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="action-edit"
                    size="sm"
                    onClick={() => onEdit(task)}
                    className="h-8 w-8 p-0 rounded-full"
                    title="Edit task"
                  >
                    <Edit01Icon className="h-3.5 w-3.5" />
                  </Button>
                   {(task.freelancer_id || task.assigned_to) && (
                     <Button
                       variant="action-status"
                       size="sm"
                       onClick={() => setStatusChangeTask(task)}
                       className="h-8 w-8 p-0 rounded-full"
                       title={`Change Status (${task.freelancer_id ? 'Freelancer' : 'Staff'})`}
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
                     onClick={() => onDelete(task.id)}
                     className="h-8 w-8 p-0 rounded-full"
                     title="Delete Task"
                   >
                     <Delete02Icon className="h-3.5 w-3.5" />
                   </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                <div>
                  <div className="text-xs text-muted-foreground">Priority</div>
                  <div className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Due Date</div>
                   <div className="text-sm font-medium">
                     {task.due_date ? new Date(task.due_date).toLocaleDateString() : '~'}
                   </div>
                </div>
                {task.event && (
                  <div>
                    <div className="text-xs text-muted-foreground">Event</div>
                    <div className="text-sm font-medium">
                      {task.event.title}{task.event.event_type ? ` (${task.event.event_type})` : ''}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className={`text-sm font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </div>
                </div>
                 {(task.freelancer && task.freelancer.full_name) || (task.assigned_staff && task.assigned_staff.full_name) ? (
                   <div>
                     <div className="text-xs text-muted-foreground">Assigned To</div>
                     <div className="text-sm font-medium">
                       {task.freelancer && task.freelancer.full_name ? (
                         <>
                           {task.freelancer.full_name}
                           <div className="text-xs text-blue-600 mt-1">Freelancer</div>
                         </>
                       ) : task.assigned_staff && task.assigned_staff.full_name ? (
                         <>
                           {task.assigned_staff.full_name}
                           <div className="text-xs text-green-600 mt-1">Staff</div>
                         </>
                       ) : null}
                     </div>
                   </div>
                 ) : null}
                {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'Completed' && (
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="text-sm font-medium text-[hsl(var(--destructive))]">
                      Overdue
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      
      {reportingTask && (
        <TaskReportDialog
          task={reportingTask}
          open={!!reportingTask}
          onOpenChange={(open) => !open && setReportingTask(null)}
          onSuccess={onStatusChange}
        />
      )}
      
      <TaskStatusDialog
        task={statusChangeTask}
        open={!!statusChangeTask}
        onOpenChange={(open) => !open && setStatusChangeTask(null)}
        onStatusChange={onStatusChange}
        onUpdateTaskStatus={onUpdateTaskStatus}
      />
    </>
  );
};

export default TaskTableView;
