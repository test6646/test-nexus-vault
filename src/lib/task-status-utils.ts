
import { TaskStatus, TaskPriority, TaskType } from '@/types/studio';

export const TASK_STATUSES: TaskStatus[] = [
  'Waiting for Response',
  'Accepted',
  'Declined',
  'In Progress', 
  'Completed',
  'Under Review',
  'On Hold',
  'Reported'
];

export const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const TASK_TYPES: TaskType[] = ['Photo Editing', 'Video Editing', 'Other'];

export const getStatusColor = (status: TaskStatus): string => {
  const colorMap: Record<TaskStatus, string> = {
    'In Progress': 'bg-status-in-progress-bg text-status-in-progress border-status-in-progress-border',
    'Completed': 'bg-status-completed-bg text-status-completed border-status-completed-border',
    'Under Review': 'bg-status-cancelled-bg text-status-cancelled border-status-cancelled-border',
    'On Hold': 'bg-status-draft-bg text-status-draft border-status-draft-border',
    'Waiting for Response': 'bg-status-pending-bg text-status-pending border-status-pending-border',
    'Accepted': 'bg-status-confirmed-bg text-status-confirmed border-status-confirmed-border',
    'Declined': 'bg-status-cancelled-bg text-status-cancelled border-status-cancelled-border',
    'Reported': 'bg-red-100 text-red-800 border-red-200'
  };
  
  return colorMap[status] || 'bg-status-draft-bg text-status-draft border-status-draft-border';
};

export const getPriorityColor = (priority: TaskPriority): string => {
  const colorMap: Record<TaskPriority, string> = {
    'Low': 'bg-status-confirmed-bg text-status-confirmed border-status-confirmed-border',
    'Medium': 'bg-status-pending-bg text-status-pending border-status-pending-border',
    'High': 'bg-status-in-progress-bg text-status-in-progress border-status-in-progress-border',
    'Urgent': 'bg-status-cancelled-bg text-status-cancelled border-status-cancelled-border'
  };
  
  return colorMap[priority] || 'bg-status-draft-bg text-status-draft border-status-draft-border';
};

export const getTaskTypeColor = (type: TaskType): string => {
  const colorMap: Record<TaskType, string> = {
    'Photo Editing': 'bg-role-photographer-bg text-role-photographer border-role-photographer-bg',
    'Video Editing': 'bg-role-cinematographer-bg text-role-cinematographer border-role-cinematographer-bg',
    'Other': 'bg-role-other-bg text-role-other border-role-other-bg'
  };
  
  return colorMap[type] || 'bg-role-other-bg text-role-other border-role-other-bg';
};

export const getDefaultTaskStatus = (): TaskStatus => 'Waiting for Response';

export const isValidTaskStatus = (status: string): status is TaskStatus => {
  return TASK_STATUSES.includes(status as TaskStatus);
};

export const isValidTaskPriority = (priority: string): priority is TaskPriority => {
  return TASK_PRIORITIES.includes(priority as TaskPriority);
};

export const isValidTaskType = (type: string): type is TaskType => {
  return TASK_TYPES.includes(type as TaskType);
};

export const normalizeTaskStatus = (status: string): TaskStatus => {
  if (isValidTaskStatus(status)) {
    return status;
  }
  return getDefaultTaskStatus();
};

export const getNextValidStatus = (currentStatus: TaskStatus): TaskStatus[] => {
  const statusFlow: Record<TaskStatus, TaskStatus[]> = {
    'Waiting for Response': ['Accepted', 'Declined', 'In Progress', 'On Hold'],
    'Accepted': ['In Progress', 'Waiting for Response'],
    'Declined': ['Waiting for Response', 'In Progress'],
    'In Progress': ['Completed', 'On Hold', 'Waiting for Response'],
    'Completed': ['In Progress'], // Allow reopening
    'Under Review': ['In Progress', 'Completed'], // Can be re-assigned or re-completed
    'On Hold': ['Waiting for Response', 'In Progress'],
    'Reported': ['In Progress'] // Staff can restart from reported status
  };
  
  return statusFlow[currentStatus] || [];
};
